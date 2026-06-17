"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
// react-leaflet-cluster@4 no longer auto-imports its CSS (so it stops breaking
// Next builds) — import both files manually, same as leaflet.css above. Safe
// under Next 16 / Turbopack because this file only ever loads client-side
// (CafeMap.tsx imports it inside a useEffect — the effective ssr:false).
import "react-leaflet-cluster/dist/assets/MarkerCluster.css";
import "react-leaflet-cluster/dist/assets/MarkerCluster.Default.css";
import Link from "next/link";
import type { CafeWithStats } from "@/types";
import { formatVisitDate } from "@/lib/terms";

interface CafeMapInnerProps {
  cafes: CafeWithStats[];
}

function getRatingColor(maxRating: number | null): string {
  if (maxRating === null) return "#8B7D72";
  if (maxRating >= 4) return "#7A9B76";
  if (maxRating === 3) return "#D4A24E";
  return "#C4704B";
}

// leaflet.markercluster only clusters L.Marker (not CircleMarker), so each café
// is a marker whose icon is a divIcon styled to match the old radius-10,
// dark-bordered rating dot. Pure HTML/CSS — no image asset, so no bundler
// broken-icon issue.
function ratingDivIcon(maxRating: number | null): L.DivIcon {
  const color = getRatingColor(maxRating);
  return L.divIcon({
    className: "", // strip Leaflet's default .leaflet-div-icon white box
    html: `<span style="display:block;width:20px;height:20px;border-radius:9999px;background:${color};opacity:0.9;border:2px solid #2C1810;box-sizing:border-box;"></span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
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
        {/* Cluster nearby cafés as density grows. Clicking a cluster zooms to
            its members (zoomToBoundsOnClick, default); individual markers keep
            their rating-colored dot + popup. */}
        <MarkerClusterGroup chunkedLoading showCoverageOnHover={false}>
          {cafes.map((cafe) => (
            <Marker
              key={cafe.id}
              position={[cafe.latitude, cafe.longitude]}
              icon={ratingDivIcon(cafe.max_rating)}
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
            </Marker>
          ))}
        </MarkerClusterGroup>
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
