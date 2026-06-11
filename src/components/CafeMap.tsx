"use client";

import { useEffect, useMemo, useState } from "react";
import type { CafeWithStats } from "@/types";
import { MapFilters } from "./MapFilters";

export function CafeMap() {
  const [cafes, setCafes] = useState<CafeWithStats[]>([]);
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{ cafes: CafeWithStats[] }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [minRating, setMinRating] = useState("");
  const [brew, setBrew] = useState("");

  const filteredCafes = useMemo(
    () =>
      cafes.filter((cafe) => {
        if (city && cafe.city !== city) return false;
        if (
          minRating &&
          (cafe.max_rating == null || cafe.max_rating < Number(minRating))
        ) {
          return false;
        }
        if (
          brew &&
          (cafe.brew_methods == null ||
            !cafe.brew_methods.split(",").includes(brew))
        ) {
          return false;
        }
        return true;
      }),
    [cafes, city, minRating, brew]
  );

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/cafes");
        if (!res.ok) {
          throw new Error(`请求失败：${res.status}`);
        }
        const json: { data?: CafeWithStats[] } = await res.json();
        setCafes(json.data ?? []);

        const mod = await import("./CafeMapInner");
        setMapComponent(() => mod.CafeMapInner);
      } catch {
        setError("咖啡馆数据加载失败，请稍后重试。");
      }
    }
    load();
  }, []);

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-cream-dark">
        <p className="text-terracotta">{error}</p>
      </div>
    );
  }

  if (!MapComponent) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-cream-dark">
        <p className="text-warm-gray">地图加载中…</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="px-4 py-2 bg-cream border-b border-cream-dark/50">
        <MapFilters
          cafes={cafes}
          city={city}
          minRating={minRating}
          brew={brew}
          onCityChange={setCity}
          onMinRatingChange={setMinRating}
          onBrewChange={setBrew}
        />
      </div>
      <div data-testid="cafe-map" className="flex-1 min-h-0 w-full">
        <MapComponent cafes={filteredCafes} />
      </div>
    </div>
  );
}
