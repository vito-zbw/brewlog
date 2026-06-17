"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Nav bell with an unread badge. The count is seeded server-side (fresh on every
// navigation, since the layout re-renders) and refreshed by a lightweight poll
// so it also updates within a session without a navigation. prefetch={false}
// for the same auth-cookie-rotation reason as the /feed link.
export function NotificationBell({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch("/api/notifications/unread-count");
        if (!res.ok) return;
        const json = (await res.json()) as { data?: { count: number } };
        if (active && json.data) setCount(json.data.count);
      } catch {
        // keep the last known count
      }
    }
    const timer = setInterval(poll, 30_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      data-testid="nav-notifications"
      prefetch={false}
      aria-label="通知"
      className="relative ml-1 px-2 py-2 rounded-lg text-cream/80 hover:text-cream hover:bg-espresso-light transition-colors text-base"
    >
      <span aria-hidden>&#128276;</span>
      {count > 0 && (
        <span
          data-testid="notification-badge"
          className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-terracotta text-cream text-[10px] font-semibold flex items-center justify-center"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
