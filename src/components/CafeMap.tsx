"use client";

import { useEffect, useState } from "react";
import type { CafeWithStats } from "@/types";

export function CafeMap() {
  const [cafes, setCafes] = useState<CafeWithStats[]>([]);
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{ cafes: CafeWithStats[] }> | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/cafes");
      const json = await res.json();
      setCafes(json.data);

      const mod = await import("./CafeMapInner");
      setMapComponent(() => mod.CafeMapInner);
    }
    load();
  }, []);

  if (!MapComponent) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-cream-dark">
        <p className="text-warm-gray">Loading map...</p>
      </div>
    );
  }

  return <MapComponent cafes={cafes} />;
}
