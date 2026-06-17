"use client";

import { useEffect, useState } from "react";
import type { CommentView, SocialResourceType } from "@/types";
import { formatVisitDate } from "@/lib/terms";

// Flat comment thread. Fetch-on-mount with the loader defined INSIDE the effect
// (project convention — keeps react-hooks/set-state-in-effect happy); a
// reloadKey counter re-runs it after a post/delete.
export function CommentsSection({
  resourceType,
  resourceId,
  currentUserId,
}: {
  resourceType: SocialResourceType;
  resourceId: number;
  currentUserId: number | null;
}) {
  const [comments, setComments] = useState<CommentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/comments?type=${resourceType}&id=${resourceId}`,
          { signal: controller.signal }
        );
        const json = (await res.json()) as { data?: CommentView[] };
        setComments(json.data ?? []);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        // keep whatever is shown; the user can retry by posting/refreshing
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [resourceType, resourceId, reloadKey]);

  const submit = async () => {
    const text = draft.trim();
    if (text.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceType, resourceId, body: text }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "发表评论失败");
        return;
      }
      setDraft("");
      setReloadKey((k) => k + 1);
    } catch {
      setError("发表评论失败");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: number) => {
    try {
      const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
      if (res.ok) setReloadKey((k) => k + 1);
    } catch {
      // ignore; user can retry
    }
  };

  return (
    <section data-testid="comments-section">
      <h2 className="text-lg font-semibold text-espresso mb-3">
        评论（{comments.length}）
      </h2>

      {currentUserId != null ? (
        <div className="mb-4">
          <textarea
            data-testid="comment-composer"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="写下你的想法…"
            rows={3}
            maxLength={2000}
            className="w-full px-3 py-2 border border-cream-dark rounded-lg bg-cream/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 text-sm resize-y"
          />
          <div className="flex items-center justify-between mt-2">
            {error ? (
              <p className="text-red-600 text-xs">{error}</p>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={submit}
              disabled={submitting || draft.trim().length === 0}
              data-testid="comment-submit"
              className="px-4 py-1.5 rounded-full text-sm font-medium bg-terracotta text-white hover:bg-terracotta-light transition-colors disabled:opacity-50"
            >
              发表
            </button>
          </div>
        </div>
      ) : (
        <a
          href="/login"
          data-testid="comment-login"
          className="inline-block mb-4 text-sm text-terracotta hover:underline"
        >
          登录后参与评论
        </a>
      )}

      {loading ? (
        <p className="text-warm-gray text-sm py-2">加载中…</p>
      ) : comments.length === 0 ? (
        <p className="text-warm-gray text-sm py-2">还没有评论，来抢沙发。</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => (
            <li
              key={c.id}
              data-testid="comment-item"
              className="flex gap-3"
            >
              {c.user_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.user_image}
                  alt={c.user_name}
                  className="h-8 w-8 rounded-full shrink-0"
                />
              ) : (
                <span className="h-8 w-8 rounded-full bg-terracotta text-white flex items-center justify-center text-xs font-semibold shrink-0">
                  {c.user_name.charAt(0)}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-espresso">
                    {c.user_name}
                  </span>
                  <span className="text-xs text-warm-gray/70">
                    {formatVisitDate(c.created_at)}
                  </span>
                  {c.user_id === currentUserId && (
                    <button
                      type="button"
                      onClick={() => remove(c.id)}
                      data-testid="comment-delete"
                      className="ml-auto text-xs text-warm-gray/70 hover:text-terracotta transition-colors"
                    >
                      删除
                    </button>
                  )}
                </div>
                <p className="text-sm text-warm-gray whitespace-pre-wrap break-words mt-0.5">
                  {c.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
