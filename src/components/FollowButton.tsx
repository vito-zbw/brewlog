"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface FollowResponse {
  data?: { following: boolean };
  error?: string;
}

export function FollowButton({
  targetUserId,
  initialFollowing,
}: {
  targetUserId: number;
  initialFollowing: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${targetUserId}/follow`, {
        method: following ? "DELETE" : "POST",
      });
      const body = (await res.json()) as FollowResponse;
      if (!res.ok || !body.data) {
        setError(body.error ?? "关注失败，请重试");
        return;
      }
      setFollowing(body.data.following);
      router.refresh();
    } catch {
      setError("关注失败，请重试");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        data-testid="follow-button"
        className={
          following
            ? "group px-4 py-1.5 rounded-full text-sm font-medium border border-cream-dark text-warm-gray bg-white hover:border-terracotta hover:text-terracotta transition-colors disabled:opacity-50"
            : "px-4 py-1.5 rounded-full text-sm font-medium bg-terracotta text-white hover:bg-terracotta-light transition-colors disabled:opacity-50"
        }
      >
        {following ? (
          <>
            <span className="group-hover:hidden">已关注</span>
            <span className="hidden group-hover:inline">取消关注</span>
          </>
        ) : (
          "关注"
        )}
      </button>
      {error && <p className="text-red-600 text-xs">{error}</p>}
    </div>
  );
}
