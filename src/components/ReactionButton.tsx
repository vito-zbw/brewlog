"use client";

import { useState } from "react";
import type { ReactionSummary, SocialResourceType } from "@/types";

// 👍 like toggle. Optimistic (clone of FollowButton's pattern): flip local state
// immediately, reconcile from the server's authoritative summary, revert on
// failure. Logged-out viewers see the count as a link to /login.
export function ReactionButton({
  resourceType,
  resourceId,
  initialCount,
  initialReacted,
  canInteract,
}: {
  resourceType: SocialResourceType;
  resourceId: number;
  initialCount: number;
  initialReacted: boolean;
  canInteract: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [reacted, setReacted] = useState(initialReacted);
  const [pending, setPending] = useState(false);

  if (!canInteract) {
    return (
      <a
        href="/login"
        data-testid="reaction-button"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border border-cream-dark text-warm-gray hover:border-terracotta hover:text-terracotta transition-colors"
      >
        <span aria-hidden>👍</span>
        <span data-testid="reaction-count">{count}</span>
      </a>
    );
  }

  const toggle = async () => {
    setPending(true);
    const next = !reacted;
    const delta = next ? 1 : -1;
    setReacted(next);
    setCount((c) => c + delta);
    try {
      const res = next
        ? await fetch("/api/reactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resourceType, resourceId }),
          })
        : await fetch(
            `/api/reactions?type=${resourceType}&id=${resourceId}`,
            { method: "DELETE" }
          );
      const body = (await res.json()) as { data?: ReactionSummary };
      if (res.ok && body.data) {
        setReacted(body.data.reacted);
        setCount(body.data.count);
      } else {
        setReacted(!next);
        setCount((c) => c - delta);
      }
    } catch {
      setReacted(!next);
      setCount((c) => c - delta);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      data-testid="reaction-button"
      aria-pressed={reacted}
      className={
        reacted
          ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-terracotta text-white hover:bg-terracotta-light transition-colors disabled:opacity-50"
          : "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border border-cream-dark text-warm-gray bg-white hover:border-terracotta hover:text-terracotta transition-colors disabled:opacity-50"
      }
    >
      <span aria-hidden>👍</span>
      <span data-testid="reaction-count">{count}</span>
    </button>
  );
}
