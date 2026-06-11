"use client";

import { useEffect, useState } from "react";
import type { CafeWithStats } from "@/types";

export function CafeMap() {
  const [cafes, setCafes] = useState<CafeWithStats[]>([]);
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{ cafes: CafeWithStats[] }> | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <div data-testid="cafe-map" className="h-full w-full">
      <MapComponent cafes={cafes} />
    </div>
  );
}
