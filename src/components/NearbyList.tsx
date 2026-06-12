"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { CafeWithStats } from "@/types";
import { formatDistance, haversineKm, type LatLng } from "@/lib/geo";

function ratingDotClass(maxRating: number | null): string {
  if (maxRating === null) return "bg-warm-gray";
  if (maxRating >= 4) return "bg-sage";
  if (maxRating >= 3) return "bg-amber-warm";
  return "bg-terracotta";
}

interface NearbyListProps {
  cafes: CafeWithStats[];
  origin: LatLng;
}

export function NearbyList({ cafes, origin }: NearbyListProps) {
  const sorted = useMemo(
    () =>
      cafes
        .map((cafe) => ({ cafe, km: haversineKm(origin, cafe) }))
        .sort((a, b) => a.km - b.km),
    [cafes, origin]
  );

  if (sorted.length === 0) {
    return (
      <div data-testid="nearby-list" className="max-h-64 overflow-y-auto">
        <p className="py-2 text-sm text-warm-gray">没有符合条件的咖啡馆。</p>
      </div>
    );
  }

  return (
    <ul
      data-testid="nearby-list"
      className="max-h-64 overflow-y-auto divide-y divide-cream-dark/50"
    >
      {sorted.map(({ cafe, km }) => (
        <li key={cafe.id} data-testid="nearby-item">
          <Link
            href={`/cafes/${cafe.id}`}
            className="flex items-center gap-2 rounded-lg px-1 py-2 hover:bg-cream"
          >
            <span
              aria-hidden
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${ratingDotClass(cafe.max_rating)}`}
            />
            <span className="flex-1 truncate text-sm font-medium text-espresso">
              {cafe.name}
            </span>
            <span className="shrink-0 text-xs text-warm-gray">
              {formatDistance(km)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
