"use client";

import { useEffect, useState } from "react";
import type { VisitWithDetails } from "@/types";
import { VisitCard } from "@/components/VisitCard";

interface VisitFeedFilters {
  cafe_id?: string;
  user_id?: string;
  bean_id?: string;
}

interface VisitPageResponse {
  data?: VisitWithDetails[];
  nextCursor?: string | null;
  error?: string;
}

/**
 * Shared, keyset-paginated visit list used by both /feed and /visits, so the
 * two surfaces render and page identically. Cursors are opaque tokens echoed
 * straight back to the API.
 *
 * - "seeded": /feed pre-renders page one on the server (auth-gated, fast first
 *   paint) and hands it in as `initial`; no fetch on mount, only on 加载更多.
 * - "filtered": /visits fetches page one on the client and re-fetches when the
 *   filters change.
 */
type VisitFeedProps =
  | {
      mode: "seeded";
      endpoint: "/api/feed";
      initial: { visits: VisitWithDetails[]; nextCursor: string | null };
    }
  | {
      mode: "filtered";
      endpoint: "/api/visits";
      filters: VisitFeedFilters;
    };

type Status = "idle" | "loading-first" | "loading-more" | "error";

function buildUrl(
  endpoint: string,
  filters: VisitFeedFilters | undefined,
  cursor: string | null
): string {
  const params = new URLSearchParams();
  if (filters?.cafe_id) params.set("cafe_id", filters.cafe_id);
  if (filters?.user_id) params.set("user_id", filters.user_id);
  if (filters?.bean_id) params.set("bean_id", filters.bean_id);
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString();
  return qs ? `${endpoint}?${qs}` : endpoint;
}

export function VisitFeed(props: VisitFeedProps) {
  const { mode, endpoint } = props;

  const [visits, setVisits] = useState<VisitWithDetails[]>(
    mode === "seeded" ? props.initial.visits : []
  );
  const [nextCursor, setNextCursor] = useState<string | null>(
    mode === "seeded" ? props.initial.nextCursor : null
  );
  const [status, setStatus] = useState<Status>(
    mode === "seeded" ? "idle" : "loading-first"
  );

  // Primitive filter values keep the effect deps stable (passing the filters
  // object would change identity every render and loop the effect).
  const cafeId = mode === "filtered" ? props.filters.cafe_id ?? "" : "";
  const userId = mode === "filtered" ? props.filters.user_id ?? "" : "";
  const beanId = mode === "filtered" ? props.filters.bean_id ?? "" : "";

  // Filtered mode only: (re)load page one on mount and on any filter change,
  // resetting the accumulated pages first so results never mix across filters.
  useEffect(() => {
    if (mode !== "filtered") return;
    let ignore = false;
    async function loadFirstPage() {
      setStatus("loading-first");
      setVisits([]);
      setNextCursor(null);
      try {
        const res = await fetch(
          buildUrl(endpoint, { cafe_id: cafeId, user_id: userId, bean_id: beanId }, null)
        );
        if (!res.ok) throw new Error(`请求失败：${res.status}`);
        const json: VisitPageResponse = await res.json();
        if (ignore) return;
        setVisits(json.data ?? []);
        setNextCursor(json.nextCursor ?? null);
        setStatus("idle");
      } catch {
        if (ignore) return;
        setVisits([]);
        setNextCursor(null);
        setStatus("error");
      }
    }
    loadFirstPage();
    return () => {
      ignore = true;
    };
  }, [mode, endpoint, cafeId, userId, beanId]);

  async function loadMore() {
    if (!nextCursor || status === "loading-more") return;
    setStatus("loading-more");
    const filters =
      mode === "filtered"
        ? { cafe_id: cafeId, user_id: userId, bean_id: beanId }
        : undefined;
    try {
      const res = await fetch(buildUrl(endpoint, filters, nextCursor));
      if (!res.ok) throw new Error(`请求失败：${res.status}`);
      const json: VisitPageResponse = await res.json();
      // Keyset pages are disjoint, so plain append is safe.
      setVisits((prev) => [...prev, ...(json.data ?? [])]);
      setNextCursor(json.nextCursor ?? null);
      setStatus("idle");
    } catch {
      // Keep already-loaded pages and the button so the user can retry.
      setStatus("error");
    }
  }

  if (status === "loading-first") {
    return <p className="text-warm-gray text-center py-12">加载中…</p>;
  }

  if (visits.length === 0) {
    return (
      <p className="text-warm-gray text-center py-12">
        {status === "error"
          ? "加载失败，请稍后重试。"
          : "没有找到符合条件的探店记录，试试调整筛选条件。"}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {visits.map((visit) => (
        <VisitCard key={visit.id} visit={visit} />
      ))}
      {nextCursor && (
        <button
          type="button"
          data-testid="load-more"
          onClick={loadMore}
          disabled={status === "loading-more"}
          className="w-full px-6 py-3 bg-terracotta hover:bg-terracotta-light text-cream rounded-xl text-sm font-medium transition-colors shadow-sm disabled:opacity-60"
        >
          {status === "loading-more" ? "加载中…" : "加载更多"}
        </button>
      )}
      {status === "error" && (
        <p className="text-warm-gray text-center text-sm">加载失败，请重试。</p>
      )}
    </div>
  );
}
