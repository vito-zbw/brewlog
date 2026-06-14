"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { FollowUser } from "@/types";
import { FollowButton } from "./FollowButton";

const TITLES = { followers: "粉丝", following: "关注" } as const;
const EMPTY = {
  followers: "还没有粉丝",
  following: "还没有关注任何人",
} as const;

type Kind = "followers" | "following";

interface ListResponse {
  data?: FollowUser[];
  error?: string;
}

export function FollowListModal({
  userId,
  kind,
  onClose,
}: {
  userId: number;
  kind: Kind;
  onClose: () => void;
}) {
  const [users, setUsers] = useState<FollowUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setUsers(null);
      setError(null);
      try {
        const res = await fetch(`/api/users/${userId}/${kind}`);
        const body = (await res.json()) as ListResponse;
        if (!active) return;
        if (!res.ok || !body.data) {
          setError(body.error ?? "加载失败");
          return;
        }
        setUsers(body.data);
      } catch {
        if (active) setError("加载失败");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [userId, kind, reloadKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-espresso/40"
      onClick={onClose}
      data-testid="follow-list-modal"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={TITLES[kind]}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl shadow-xl max-h-[80vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-cream-dark/50">
          <h2 className="font-[Playfair_Display] font-semibold text-espresso">
            {TITLES[kind]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            data-testid="follow-list-close"
            className="p-1 rounded-lg text-warm-gray hover:text-espresso hover:bg-cream transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-2">
          {error ? (
            <div className="text-center py-10">
              <p className="text-warm-gray text-sm mb-3">{error}</p>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="px-4 py-1.5 rounded-full text-sm border border-cream-dark text-warm-gray hover:border-terracotta hover:text-terracotta transition-colors"
              >
                重试
              </button>
            </div>
          ) : users === null ? (
            <p className="text-warm-gray text-sm text-center py-10">加载中…</p>
          ) : users.length === 0 ? (
            <p
              data-testid="follow-list-empty"
              className="text-warm-gray text-sm text-center py-10"
            >
              {EMPTY[kind]}
            </p>
          ) : (
            <ul className="divide-y divide-cream-dark/40">
              {users.map((u) => (
                <FollowRow
                  key={u.id}
                  user={u}
                  kind={kind}
                  onNavigate={onClose}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function FollowRow({
  user,
  kind,
  onNavigate,
}: {
  user: FollowUser;
  kind: Kind;
  onNavigate: () => void;
}) {
  const badge =
    kind === "followers"
      ? user.isMutual
        ? "互相关注"
        : null
      : user.isMutual
        ? "关注了你"
        : null;

  return (
    <li
      data-testid="follow-list-row"
      className="flex items-center gap-3 px-3 py-2"
    >
      <Link
        href={`/users/${user.id}`}
        onClick={onNavigate}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt={user.name}
            className="h-10 w-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="h-10 w-10 rounded-full bg-terracotta text-white flex items-center justify-center font-bold shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-espresso font-medium truncate">
            {user.name}
          </span>
          {badge && (
            <span className="text-xs text-warm-gray bg-cream rounded-full px-2 py-0.5 shrink-0">
              {badge}
            </span>
          )}
        </span>
      </Link>
      <FollowButton
        targetUserId={user.id}
        initialFollowing={kind === "following" ? true : user.isMutual}
        followLabel={kind === "followers" ? "回关" : "关注"}
      />
    </li>
  );
}
