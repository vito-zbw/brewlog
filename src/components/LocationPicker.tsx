"use client";

import { useEffect, useState } from "react";
import type { GeocodeResult } from "@/types";
import type { LatLng } from "@/lib/geo";

const inputClass =
  "w-full px-4 py-2 border border-cream-dark rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-terracotta/30 text-sm";

// Default map center matches the /cafes map (Guangzhou).
const DEFAULT_CENTER: LatLng = { latitude: 23.1291, longitude: 113.2644 };

interface LocationPickerProps {
  value: LatLng | null;
  onChange: (next: LatLng) => void;
  /** Auto-fill city/country from a search/reverse-geocode hit. */
  onResolved?: (info: { city: string; country: string }) => void;
}

interface InnerProps {
  value: LatLng | null;
  onChange: (next: LatLng) => void;
  center: LatLng;
  zoom?: number;
}

/**
 * Search-first café location capture: type an address/name → pick a result,
 * or tap the map, or use GPS. Coordinates are never typed by hand. Mirrors
 * CafeMap's runtime-import lazy-load so Leaflet stays out of SSR.
 */
export function LocationPicker({ value, onChange, onResolved }: LocationPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [pickerError, setPickerError] = useState("");
  const [MapComponent, setMapComponent] =
    useState<React.ComponentType<InnerProps> | null>(null);

  useEffect(() => {
    async function loadMap() {
      const mod = await import("./LocationPickerInner");
      setMapComponent(() => mod.LocationPickerInner);
    }
    loadMap();
  }, []);

  async function runSearch() {
    const q = query.trim();
    if (!q || searching) return;
    setSearching(true);
    setPickerError("");
    setResults([]);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const json = (await res.json()) as {
        data?: GeocodeResult[];
        error?: string;
      };
      if (!res.ok || json.error) {
        setPickerError(json.error ?? "地点搜索失败，请稍后重试。");
        return;
      }
      const found = json.data ?? [];
      setResults(found);
      if (found.length === 0) {
        setPickerError("未找到匹配的地点，请尝试其他关键词或在地图上标记。");
      }
    } catch {
      setPickerError("地点搜索失败，请稍后重试。");
    } finally {
      setSearching(false);
    }
  }

  function selectResult(r: GeocodeResult) {
    onChange({ latitude: r.latitude, longitude: r.longitude });
    onResolved?.({ city: r.city, country: r.country });
    setResults([]);
    setQuery(r.displayName);
  }

  function handleGps() {
    if (locating) return;
    if (!("geolocation" in navigator)) {
      setPickerError("无法获取位置，请检查浏览器定位权限。");
      return;
    }
    setPickerError("");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coord = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        onChange(coord);
        setLocating(false);
        // Best-effort reverse geocode to fill city/country; non-blocking.
        async function reverse() {
          try {
            const r = await fetch(
              `/api/geocode?lat=${coord.latitude}&lon=${coord.longitude}`
            );
            const j = (await r.json()) as { data?: GeocodeResult[] };
            const hit = j.data?.[0];
            if (hit) onResolved?.({ city: hit.city, country: hit.country });
          } catch {
            // Coordinates already set; city/country stay editable.
          }
        }
        reverse();
      },
      () => {
        setLocating(false);
        setPickerError("无法获取位置，请检查浏览器定位权限。");
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          data-testid="log-cafe-search-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              // Don't submit the surrounding visit form.
              e.preventDefault();
              void runSearch();
            }
          }}
          placeholder="搜索咖啡馆名称或地址…"
          className={inputClass}
        />
        <button
          type="button"
          data-testid="log-cafe-search-submit"
          onClick={() => void runSearch()}
          disabled={searching}
          className="shrink-0 px-4 py-2 bg-terracotta text-cream rounded-lg text-sm hover:bg-terracotta-light disabled:opacity-50"
        >
          {searching ? "搜索中…" : "搜索"}
        </button>
      </div>

      {results.length > 0 && (
        <ul className="border border-cream-dark rounded-lg divide-y divide-cream-dark/50 overflow-hidden">
          {results.map((r, i) => (
            <li key={`${r.latitude},${r.longitude},${i}`}>
              <button
                type="button"
                data-testid="log-cafe-search-result"
                onClick={() => selectResult(r)}
                className="block w-full text-left px-3 py-2 text-sm text-espresso hover:bg-cream-dark/40"
              >
                {r.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        data-testid="log-cafe-map"
        className="h-64 w-full rounded-lg overflow-hidden border border-cream-dark"
      >
        {MapComponent ? (
          <MapComponent
            value={value}
            onChange={onChange}
            center={value ?? DEFAULT_CENTER}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-cream-dark">
            <p className="text-warm-gray text-sm">地图加载中…</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          data-testid="log-cafe-gps"
          onClick={handleGps}
          disabled={locating}
          className="px-3 py-1.5 border border-cream-dark rounded-lg bg-white text-sm text-espresso hover:bg-cream-dark/40 disabled:opacity-60"
        >
          {locating ? "定位中…" : "📍 使用我的位置"}
        </button>
        <span className="text-xs text-warm-gray">
          地图数据 ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            OpenStreetMap
          </a>
        </span>
      </div>

      {value && (
        <p className="text-xs text-warm-gray">
          已选位置：{value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
        </p>
      )}

      {pickerError && (
        <span
          data-testid="log-cafe-loc-error"
          role="status"
          className="block text-sm text-terracotta"
        >
          {pickerError}
        </span>
      )}
    </div>
  );
}
