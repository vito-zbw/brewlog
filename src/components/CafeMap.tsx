"use client";

import { useEffect, useMemo, useState } from "react";
import type { CafeWithStats } from "@/types";
import type { LatLng } from "@/lib/geo";
import { MapFilters } from "./MapFilters";
import { NearbyList } from "./NearbyList";

export function CafeMap() {
  const [cafes, setCafes] = useState<CafeWithStats[]>([]);
  const [MapComponent, setMapComponent] = useState<React.ComponentType<{ cafes: CafeWithStats[] }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [city, setCity] = useState("");
  const [minRating, setMinRating] = useState("");
  const [brew, setBrew] = useState("");
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);

  function handleNearbyClick() {
    if (locating) return;
    if (panelOpen) {
      setPanelOpen(false);
      return;
    }
    if (!("geolocation" in navigator)) {
      setGeoError(true);
      return;
    }
    setGeoError(false);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setLocating(false);
        setPanelOpen(true);
      },
      () => {
        setLocating(false);
        setGeoError(true);
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }

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
      <div className="px-4 py-2 bg-cream border-b border-cream-dark/50 flex flex-wrap items-center gap-2">
        <MapFilters
          cafes={cafes}
          city={city}
          minRating={minRating}
          brew={brew}
          onCityChange={setCity}
          onMinRatingChange={setMinRating}
          onBrewChange={setBrew}
        />
        <button
          type="button"
          onClick={handleNearbyClick}
          disabled={locating}
          data-testid="nearby-button"
          className="px-3 py-1.5 border border-cream-dark rounded-lg bg-white text-sm text-espresso hover:bg-cream-dark/40 disabled:opacity-60"
        >
          {locating
            ? "定位中…"
            : coords && panelOpen
              ? "收起列表"
              : "📍 附近的咖啡馆"}
        </button>
        {geoError && (
          <span
            role="status"
            data-testid="nearby-error"
            className="text-sm text-terracotta"
          >
            无法获取位置，请检查浏览器定位权限。
          </span>
        )}
        {/* Rendered marker count — deterministic for filter verification (the
            map DOM clusters markers, so counting marker elements is unreliable). */}
        <span
          data-testid="cafe-marker-count"
          className="ml-auto text-sm text-warm-gray"
        >
          {filteredCafes.length} 家咖啡馆
        </span>
      </div>
      {panelOpen && coords && (
        <div className="px-4 py-2 bg-white border-b border-cream-dark/50">
          <NearbyList cafes={filteredCafes} origin={coords} />
        </div>
      )}
      <div data-testid="cafe-map" className="flex-1 min-h-0 w-full">
        <MapComponent cafes={filteredCafes} />
      </div>
    </div>
  );
}
