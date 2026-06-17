"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { NotificationView } from "@/types";
import {
  NOTIFICATION_EVENT_LABELS,
  RESOURCE_TYPE_LABELS,
  formatVisitDate,
} from "@/lib/terms";

// Where a notification links: follows → the actor's profile; comment/reaction →
// the target resource (/visits|/beans|/crawls + id).
function linkFor(n: NotificationView): string {
  if (
    (n.event_type === "comment" || n.event_type === "reaction") &&
    n.resource_type &&
    n.resource_id != null
  ) {
    return `/${n.resource_type}s/${n.resource_id}`;
  }
  return `/users/${n.actor_id}`;
}

// The verb phrase after the actor's name, e.g. "关注了你" / "评论了你的探店记录".
function sentence(n: NotificationView): string {
  const verb = NOTIFICATION_EVENT_LABELS[n.event_type] ?? "";
  if (
    (n.event_type === "comment" || n.event_type === "reaction") &&
    n.resource_type
  ) {
    return `${verb}${RESOURCE_TYPE_LABELS[n.resource_type] ?? ""}`;
  }
  return verb;
}

export function NotificationsList({
  initial,
}: {
  initial: { notifications: NotificationView[]; nextCursor: string | null };
}) {
  const router = useRouter();
  const [items, setItems] = useState(initial.notifications);
  const [nextCursor, setNextCursor] = useState(initial.nextCursor);
  const [loading, setLoading] = useState(false);

  // The /notifications page marks everything read server-side before render, so
  // refresh once on mount to re-run the layout (and reseed the nav bell badge to
  // zero) instead of waiting for the bell's 30s poll — matters for soft navs,
  // where the preserved root layout wouldn't otherwise re-render.
  useEffect(() => {
    router.refresh();
  }, [router]);

  async function loadMore() {
    if (!nextCursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/notifications?cursor=${encodeURIComponent(nextCursor)}`
      );
      if (!res.ok) throw new Error("请求失败");
      const json = (await res.json()) as {
        data?: NotificationView[];
        nextCursor?: string | null;
      };
      setItems((prev) => [...prev, ...(json.data ?? [])]);
      setNextCursor(json.nextCursor ?? null);
    } catch {
      // keep loaded items; the button stays for retry
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <p
        data-testid="notifications-empty"
        className="text-warm-gray text-center py-12"
      >
        还没有通知。关注好友、收到评论或点赞时会出现在这里。
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((n) => (
        <Link
          key={n.id}
          href={linkFor(n)}
          data-testid="notification-item"
          className={`flex items-center gap-3 p-4 rounded-xl border transition-colors hover:border-terracotta ${
            n.read_at
              ? "bg-white border-cream-dark/50"
              : "bg-sage/5 border-sage/30"
          }`}
        >
          {n.actor_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={n.actor_image}
              alt={n.actor_name}
              className="h-9 w-9 rounded-full shrink-0"
            />
          ) : (
            <span className="h-9 w-9 rounded-full bg-terracotta text-cream flex items-center justify-center text-sm font-semibold shrink-0">
              {n.actor_name.charAt(0)}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-espresso">
              <span className="font-medium">{n.actor_name}</span> {sentence(n)}
            </p>
            <p className="text-xs text-warm-gray/70">
              {formatVisitDate(n.created_at)}
            </p>
          </div>
          {!n.read_at && (
            <span
              data-testid="notification-unread-dot"
              className="h-2 w-2 rounded-full bg-terracotta shrink-0"
            />
          )}
        </Link>
      ))}
      {nextCursor && (
        <button
          type="button"
          data-testid="load-more"
          onClick={loadMore}
          disabled={loading}
          className="w-full px-6 py-3 bg-terracotta hover:bg-terracotta-light text-cream rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-60"
        >
          {loading ? "加载中…" : "加载更多"}
        </button>
      )}
    </div>
  );
}
