"use client";

import { useMemo, useEffect, useRef } from "react";
import L from "leaflet";
import type { LeafletEventHandlerFnMap } from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { getPublicImageUrl } from "@/lib/media-url";
import type { GlobalPresenceLocation } from "@/types/home-content";
import { ExternalLink } from "lucide-react";

import "leaflet/dist/leaflet.css";

/** Ajusta o view do mapa para incluir todos os marcadores com padding. */
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  const bounds = useMemo(() => {
    if (positions.length === 0) return null;
    return L.latLngBounds(positions);
  }, [positions]);
  useEffect(() => {
    if (bounds && positions.length > 0) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });
    }
  }, [map, bounds, positions.length]);
  return null;
}

/** Ícone customizado para combinar com o tema (cor de destaque). */
function createMarkerIcon(accentColor: string) {
  return L.divIcon({
    className: "global-presence-leaflet-marker",
    html: `
      <span style="
        display: block;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: ${accentColor};
        border: 2px solid white;
        box-shadow: 0 0 0 2px ${accentColor}40;
      "></span>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export function GlobalPresenceLeafletMap({
  byPosition,
  accentColor,
  lang,
}: {
  byPosition: Array<{ lat: number; lng: number; locations: GlobalPresenceLocation[] }>;
  accentColor: string;
  lang: "pt" | "en";
}) {
  const positions = useMemo(
    () => byPosition.map((g) => [g.lat, g.lng] as [number, number]),
    [byPosition]
  );
  const defaultCenter: [number, number] = [20, 0];
  const markerIcon = useMemo(() => createMarkerIcon(accentColor), [accentColor]);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markerEventHandlers: LeafletEventHandlerFnMap = useMemo(
    () => ({
      mouseover(ev) {
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current);
          closeTimeoutRef.current = null;
        }
        ev.target.openPopup();
      },
      mouseout(ev) {
        closeTimeoutRef.current = setTimeout(() => {
          ev.target.closePopup();
          closeTimeoutRef.current = null;
        }, 200);
      },
    }),
    []
  );

  return (
    <div className="global-presence-map-dark relative h-full w-full rounded-xl overflow-hidden border border-white/10 bg-zinc-900/50 [&_.leaflet-container]:rounded-xl [&_.leaflet-container]:bg-zinc-900">
      <MapContainer
        center={defaultCenter}
        zoom={2}
        minZoom={2}
        maxZoom={18}
        className="h-full w-full"
        scrollWheelZoom
        style={{ background: "#1e293b" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> | &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {positions.length > 0 && <FitBounds positions={positions} />}
        {byPosition.map((group) => (
          <Marker
            key={`${group.lat}_${group.lng}`}
            position={[group.lat, group.lng]}
            icon={markerIcon}
            eventHandlers={markerEventHandlers}
          >
            <Popup className="global-presence-popup" maxWidth={320} autoPan closeButton>
              <div className="space-y-3 text-left bg-zinc-900 text-white rounded-lg border border-white/10 shadow-xl p-3 min-w-[200px]">
                {group.locations.map((loc, i) => {
                  const logoUrl = loc.logoMediaId?.trim()
                    ? getPublicImageUrl(loc.logoMediaId)
                    : undefined;
                  const websiteUrl = (loc.websiteUrl as string)?.trim();
                  const cityCountry = [loc.city, loc.country].filter(Boolean).join(", ");
                  return (
                    <div
                      key={loc.id}
                      className={i > 0 ? "pt-3 border-t border-zinc-600" : ""}
                    >
                      <div className="flex items-start gap-2">
                        {logoUrl && (
                          <img
                            src={logoUrl}
                            alt=""
                            className="h-10 w-10 rounded object-contain flex-shrink-0 bg-zinc-800"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate">{loc.name}</p>
                          {loc.type && (
                            <p className="text-xs text-zinc-400 uppercase tracking-wide">
                              {loc.type}
                            </p>
                          )}
                          {cityCountry && (
                            <p className="text-xs text-zinc-500 mt-0.5">{cityCountry}</p>
                          )}
                          {websiteUrl && (
                            <a
                              href={websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-sky-400 hover:text-sky-300 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {lang === "pt" ? "Acessar site" : "Visit site"}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <p className="absolute bottom-3 left-3 z-[1000] text-xs text-zinc-500 pointer-events-none">
        {lang === "pt"
          ? "Use o scroll ou os controles para zoom até o nível da cidade."
          : "Use scroll or controls to zoom down to city level."}
      </p>
    </div>
  );
}
