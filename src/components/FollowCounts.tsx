"use client";

import { useState } from "react";
import { FollowListModal } from "./FollowListModal";

type Kind = "followers" | "following";

export function FollowCounts({
  userId,
  following,
  followers,
}: {
  userId: number;
  following: number;
  followers: number;
}) {
  const [open, setOpen] = useState<Kind | null>(null);

  return (
    <>
      <p className="text-warm-gray text-sm mt-1" data-testid="follow-counts">
        <button
          type="button"
          onClick={() => setOpen("following")}
          data-testid="open-following"
          className="hover:text-terracotta transition-colors"
        >
          {following} 关注
        </button>
        {" · "}
        <button
          type="button"
          onClick={() => setOpen("followers")}
          data-testid="open-followers"
          className="hover:text-terracotta transition-colors"
        >
          {followers} 粉丝
        </button>
      </p>
      {open && (
        <FollowListModal
          userId={userId}
          kind={open}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
