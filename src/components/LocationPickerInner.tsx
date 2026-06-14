"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLng } from "@/lib/geo";

interface LocationPickerInnerProps {
  value: LatLng | null;
  onChange: (next: LatLng) => void;
  center: LatLng;
  zoom?: number;
}

// Tap anywhere on the map to (re)place the pin. CircleMarker is not draggable
// in Leaflet, so click-to-place is how we fine-tune — and it avoids the
// default-Marker icon-path fix the rest of the app deliberately sidesteps.
function ClickCapture({ onChange }: { onChange: (next: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onChange({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    },
  });
  return null;
}

// Pan the map when a search result (or GPS fix) changes the chosen location.
function Recenter({ target }: { target: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([target.latitude, target.longitude], map.getZoom());
  }, [target, map]);
  return null;
}

export function LocationPickerInner({
  value,
  onChange,
  center,
  zoom,
}: LocationPickerInnerProps) {
  return (
    <MapContainer
      center={[center.latitude, center.longitude]}
      zoom={zoom ?? 13}
      className="h-full w-full"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickCapture onChange={onChange} />
      <Recenter target={value ?? center} />
      {value && (
        <CircleMarker
          center={[value.latitude, value.longitude]}
          radius={10}
          pathOptions={{
            fillColor: "#C4704B",
            fillOpacity: 0.9,
            color: "#2C1810",
            weight: 2,
          }}
        />
      )}
    </MapContainer>
  );
}
