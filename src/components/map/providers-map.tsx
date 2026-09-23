"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import type { ProviderCardData } from "@/components/provider-card";
import Link from "next/link";
import "leaflet/dist/leaflet.css";

function markerIcon(status: string | null | undefined) {
  const color =
    status === "confirmed" ? "#059669" : status === "not_accepted" ? "#e11d48" : "#d97706";
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function FitBounds({
  providers,
  origin,
}: {
  providers: ProviderCardData[];
  origin?: { lat: number; lng: number };
}) {
  const map = useMap();
  useEffect(() => {
    const points: [number, number][] = providers
      .filter((p) => "latitude" in p && "longitude" in p)
      .map((p) => [(p as ProviderCardData & { latitude: number }).latitude, (p as ProviderCardData & { longitude: number }).longitude]);
    if (origin) points.push([origin.lat, origin.lng]);
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  }, [map, providers, origin]);
  return null;
}

type Props = {
  providers: (ProviderCardData & { latitude?: number; longitude?: number })[];
  origin?: { lat: number; lng: number };
};

export function ProvidersMap({ providers, origin }: Props) {
  const center = useMemo(() => {
    if (origin) return [origin.lat, origin.lng] as [number, number];
    const first = providers.find((p) => p.latitude && p.longitude);
    if (first?.latitude && first?.longitude) return [first.latitude, first.longitude] as [number, number];
    return [-23.5505, -46.6333] as [number, number];
  }, [providers, origin]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
      <MapContainer center={center} zoom={13} className="h-80 w-full md:h-96" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds providers={providers} origin={origin} />
        {providers.map((p) =>
          p.latitude != null && p.longitude != null ? (
            <Marker
              key={p.id}
              position={[p.latitude, p.longitude]}
              icon={markerIcon(p.planStatus)}
            >
              <Popup>
                <div className="min-w-[140px] text-sm">
                  <strong>{p.name}</strong>
                  <div className="text-xs text-slate-600">{p.specialties?.[0]}</div>
                  <Link className="text-xs font-semibold text-sky-700" href={`/provedores/${p.id}`}>
                    Ver detalhes
                  </Link>
                </div>
              </Popup>
            </Marker>
          ) : null
        )}
      </MapContainer>
      <div className="flex gap-3 border-t border-slate-100 bg-white px-3 py-2 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-600" /> Aceita
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 rounded-full bg-amber-600" /> Confirmar
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-2.5 w-2.5 rounded-full bg-rose-600" /> Não aceita
        </span>
      </div>
    </div>
  );
}
