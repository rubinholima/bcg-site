"use client";

import { useEffect, useMemo, useState, Fragment } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Circle,
  Popup,
  useMap,
} from "react-leaflet";
import type { CaptacaoMapData, ScoutLocationStatus } from "@/lib/captacao-types";
import { labelForLocationStatus } from "@/lib/captacao-types";
import { formatCoords, minutesSince } from "@/lib/scout-geolocation";

import "leaflet/dist/leaflet.css";

const STATUS_COLOR: Record<ScoutLocationStatus, string> = {
  live: "#34d399",
  recent: "#38bdf8",
  offline: "#71717a",
};

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const bounds = useMemo(() => {
    if (positions.length === 0) return null;
    return L.latLngBounds(positions);
  }, [positions]);
  useEffect(() => {
    if (bounds && positions.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [map, bounds, positions.length]);
  return null;
}

function scoutIcon(status: ScoutLocationStatus, isTracking: boolean) {
  const color = STATUS_COLOR[status];
  const pulse =
    status === "live"
      ? `<span style="
          position:absolute;inset:-6px;border-radius:50%;
          border:2px solid ${color};opacity:0.5;
          animation:captacao-pulse 1.8s ease-out infinite;
        "></span>`
      : "";
  return L.divIcon({
    className: "captacao-scout-marker",
    html: `
      <span style="position:relative;display:block;width:16px;height:16px;">
        ${pulse}
        <span style="
          position:relative;display:block;width:16px;height:16px;border-radius:50%;
          background:${color};border:2px solid white;
          box-shadow:0 0 0 2px ${color}55;
        "></span>
      </span>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export function CaptacaoScoutMap({
  data,
  selectedScoutId,
  onSelectScout,
  height = 420,
}: {
  data: CaptacaoMapData;
  selectedScoutId?: string | null;
  onSelectScout?: (id: string) => void;
  height?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const positioned = useMemo(
    () =>
      data.scouts.filter(
        (s) => s.lastLatitude != null && s.lastLongitude != null,
      ),
    [data.scouts],
  );

  const positions = useMemo(
    () =>
      positioned.map(
        (s) => [s.lastLatitude!, s.lastLongitude!] as [number, number],
      ),
    [positioned],
  );

  const defaultCenter: [number, number] = [-15.78, -47.93];

  if (!mounted) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-border bg-card/50"
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">Carregando mapa...</p>
      </div>
    );
  }

  return (
    <div
      className="global-presence-map-dark relative w-full overflow-hidden rounded-xl border border-border bg-zinc-900/50 [&_.leaflet-container]:rounded-xl [&_.leaflet-container]:bg-zinc-900"
      style={{ height }}
    >
      <style>{`
        @keyframes captacao-pulse {
          0% { transform: scale(0.85); opacity: 0.7; }
          70% { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        .captacao-scout-marker.leaflet-div-icon {
          background: transparent;
          border: none;
        }
      `}</style>
      <MapContainer
        center={positions[0] ?? defaultCenter}
        zoom={positions.length ? 6 : 4}
        minZoom={3}
        maxZoom={18}
        className="h-full w-full"
        scrollWheelZoom
        style={{ background: "#1e293b" }}
      >
        <TileLayer
          attribution='&copy; OSM | CARTO'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {positions.length > 0 && <FitBounds positions={positions} />}

        {positioned.map((scout) => {
          const lat = scout.lastLatitude!;
          const lng = scout.lastLongitude!;
          const trail = data.trails[scout.id] ?? [];
          const trailPositions = trail.map(
            (p) => [p.lat, p.lng] as [number, number],
          );
          const isSelected = selectedScoutId === scout.id;
          const mins = minutesSince(scout.lastLocationAt);

          return (
            <Fragment key={scout.id}>
              {trailPositions.length > 1 && (
                <Polyline
                  positions={trailPositions}
                  pathOptions={{
                    color: isSelected ? "#fbbf24" : STATUS_COLOR[scout.locationStatus],
                    weight: isSelected ? 4 : 2,
                    opacity: 0.75,
                    dashArray: scout.isTracking ? undefined : "6 8",
                  }}
                />
              )}
              {scout.isTracking && (
                <Circle
                  center={[lat, lng]}
                  radius={8000}
                  pathOptions={{
                    color: STATUS_COLOR.live,
                    fillColor: STATUS_COLOR.live,
                    fillOpacity: 0.08,
                    weight: 1,
                  }}
                />
              )}
              <Marker
                position={[lat, lng]}
                icon={scoutIcon(scout.locationStatus, scout.isTracking)}
                eventHandlers={{
                  click: () => onSelectScout?.(scout.id),
                }}
              >
                <Popup>
                  <div className="min-w-[180px] text-sm text-zinc-900">
                    <p className="font-bold">{scout.name}</p>
                    <p className="text-xs uppercase tracking-wide text-zinc-600">
                      {labelForLocationStatus(scout.locationStatus)}
                      {scout.isTracking ? " · GPS ativo" : ""}
                    </p>
                    {scout.lastLocationLabel && (
                      <p className="mt-1 text-xs">{scout.lastLocationLabel}</p>
                    )}
                    <p className="mt-1 font-mono text-[10px] text-zinc-500">
                      {formatCoords(lat, lng)}
                    </p>
                    {mins != null && (
                      <p className="text-[10px] text-zinc-500">
                        Atualizado há {mins} min
                      </p>
                    )}
                    <p className="mt-1 text-xs">
                      {scout.activeProspectsCount} prospect(s) ativo(s)
                    </p>
                  </div>
                </Popup>
              </Marker>
            </Fragment>
          );
        })}
      </MapContainer>

      <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] flex flex-wrap gap-2">
        {(["live", "recent", "offline"] as ScoutLocationStatus[]).map((s) => (
          <span
            key={s}
            className="rounded-full border border-white/10 bg-zinc-900/90 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-300"
          >
            <span
              className="mr-1 inline-block h-2 w-2 rounded-full"
              style={{ background: STATUS_COLOR[s] }}
            />
            {labelForLocationStatus(s)}
          </span>
        ))}
      </div>
    </div>
  );
}
