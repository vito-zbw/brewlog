"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import type { CafeWithStats } from "@/types";
import { formatVisitDate } from "@/lib/terms";

interface CafeMapInnerProps {
  cafes: CafeWithStats[];
}

function getRatingColor(maxRating: number | null): string {
  if (maxRating === null) return "#8B7D72";
  if (maxRating >= 4) return "#7A9B76";
  if (maxRating >= 3) return "#D4A24E";
  return "#C4704B";
}

const LEGEND_ITEMS = [
  { dotClass: "bg-sage", label: "绿 4-5分" },
  { dotClass: "bg-amber-warm", label: "黄 3分" },
  { dotClass: "bg-terracotta", label: "红 1-2分" },
  { dotClass: "bg-warm-gray", label: "灰 暂无探店" },
] as const;

export function CafeMapInner({ cafes }: CafeMapInnerProps) {
  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[23.1291, 113.2644]}
        zoom={12}
        className="h-full w-full"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {cafes.map((cafe) => (
          <CircleMarker
            key={cafe.id}
            center={[cafe.latitude, cafe.longitude]}
            radius={10}
            pathOptions={{
              fillColor: getRatingColor(cafe.max_rating),
              fillOpacity: 0.9,
              color: "#2C1810",
              weight: 2,
            }}
          >
            <Popup>
              <div data-testid="cafe-popup" className="text-sm min-w-[180px]">
                <h3 className="font-bold text-espresso text-base mb-1">{cafe.name}</h3>
                <p className="text-warm-gray mb-1">
                  {cafe.city}, {cafe.country}
                </p>
                {cafe.max_rating !== null ? (
                  <>
                    <p className="mb-1">
                      最高评分 <strong>{cafe.max_rating}</strong>/5
                    </p>
                    {cafe.last_visit_date && (
                      <p className="mb-1">最近到访 {formatVisitDate(cafe.last_visit_date)}</p>
                    )}
                    <p className="mb-2">{cafe.visit_count} 次探店</p>
                  </>
                ) : (
                  <p className="mb-2">还没有探店记录</p>
                )}
                <Link
                  href={`/cafes/${cafe.id}`}
                  className="text-terracotta hover:underline font-medium"
                >
                  查看咖啡馆详情 &rarr;
                </Link>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      <div
        data-testid="map-legend"
        className="absolute bottom-4 left-4 z-[1000] rounded bg-white/90 px-3 py-2 shadow text-xs text-espresso space-y-1"
      >
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className={`inline-block h-3 w-3 rounded-full border border-espresso/40 ${item.dotClass}`}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
