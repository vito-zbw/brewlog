"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { CafeWithStats } from "@/types";
import Link from "next/link";

interface CafeMapInnerProps {
  cafes: CafeWithStats[];
}

function getRatingColor(avgRating: number | null): string {
  if (avgRating === null) return "#8B7D72";
  if (avgRating >= 4) return "#7A9B76";
  if (avgRating >= 3) return "#D4A24E";
  return "#C4704B";
}

export function CafeMapInner({ cafes }: CafeMapInnerProps) {
  return (
    <MapContainer
      center={[1.3521, 103.8198]}
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
            fillColor: getRatingColor(cafe.avg_rating),
            fillOpacity: 0.9,
            color: "#2C1810",
            weight: 2,
          }}
        >
          <Popup>
            <div className="text-sm min-w-[180px]">
              <h3 className="font-bold text-espresso text-base mb-1">{cafe.name}</h3>
              <p className="text-warm-gray mb-1">{cafe.city}, {cafe.country}</p>
              {cafe.avg_rating !== null && (
                <p className="mb-1">
                  Avg rating: <strong>{cafe.avg_rating.toFixed(1)}</strong>/5
                </p>
              )}
              <p className="mb-2">{cafe.visit_count} visit{cafe.visit_count !== 1 ? "s" : ""}</p>
              <Link
                href={`/visits?cafe_id=${cafe.id}`}
                className="text-terracotta hover:underline font-medium"
              >
                View visits &rarr;
              </Link>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
