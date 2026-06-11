"use client";

import { useMemo } from "react";
import type { CafeWithStats } from "@/types";
import { BREW_METHODS } from "@/lib/terms";

const RATING_OPTIONS = ["4", "3", "2", "1"] as const;

const selectClass =
  "px-3 py-1.5 border border-cream-dark rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-terracotta/30 text-sm text-espresso";

interface MapFiltersProps {
  cafes: CafeWithStats[];
  city: string;
  minRating: string;
  brew: string;
  onCityChange: (v: string) => void;
  onMinRatingChange: (v: string) => void;
  onBrewChange: (v: string) => void;
}

export function MapFilters({
  cafes,
  city,
  minRating,
  brew,
  onCityChange,
  onMinRatingChange,
  onBrewChange,
}: MapFiltersProps) {
  const cities = useMemo(
    () =>
      Array.from(new Set(cafes.map((c) => c.city))).sort((a, b) =>
        a.localeCompare(b, "zh-CN")
      ),
    [cafes]
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={city}
        onChange={(e) => onCityChange(e.target.value)}
        data-testid="map-filter-city"
        className={selectClass}
      >
        <option value="">全部城市</option>
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select
        value={minRating}
        onChange={(e) => onMinRatingChange(e.target.value)}
        data-testid="map-filter-rating"
        className={selectClass}
      >
        <option value="">不限评分</option>
        {RATING_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {r} 分以上
          </option>
        ))}
      </select>
      <select
        value={brew}
        onChange={(e) => onBrewChange(e.target.value)}
        data-testid="map-filter-brew"
        className={selectClass}
      >
        <option value="">全部冲煮方式</option>
        {BREW_METHODS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}
