"use client";

import dynamic from "next/dynamic";
import { useRef, useEffect, useState } from "react";
import type { HomeContentBlock } from "@/types/home-content";
import { getPublicImageUrl } from "@/lib/media-url";
import { moduleBottomBorderClass } from "@/lib/module-section-border";
import { SmartImage } from "@/components/common/SmartImage";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import type { GlobalPresenceLocation, GlobalPresenceCounter } from "@/types/home-content";
import { MapPin } from "lucide-react";

const GlobalPresenceLeafletMap = dynamic(
  () =>
    import("./GlobalPresenceLeafletMap").then((m) => m.GlobalPresenceLeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-[2/1] min-h-[300px] sm:min-h-[380px] rounded-xl bg-zinc-900/50 border border-white/10 flex items-center justify-center text-zinc-500">
        Carregando mapa…
      </div>
    ),
  }
);

/** Agrupa localizações pelo mesmo ponto no mapa (lat/lng iguais ou muito próximos). */
function groupLocationsByPosition(locations: GlobalPresenceLocation[]): Array<{ lat: number; lng: number; locations: GlobalPresenceLocation[] }> {
  const byPos = new Map<string, GlobalPresenceLocation[]>();
  for (const loc of locations) {
    const key = `${loc.lat}_${loc.lng}`;
    if (!byPos.has(key)) byPos.set(key, []);
    byPos.get(key)!.push(loc);
  }
  return Array.from(byPos.entries()).map(([, locs]) => ({
    lat: locs[0].lat,
    lng: locs[0].lng,
    locations: locs,
  }));
}

/** Agrupa localizações por país; cada país tem lista de cidades (nomes únicos das locations). */
function groupLocationsByCountry(
  locations: GlobalPresenceLocation[],
  lang: "pt" | "en"
): Array<{ country: string; cities: string[]; locations: GlobalPresenceLocation[] }> {
  const otherLabel = lang === "pt" ? "Outros" : "Other";
  const byCountry = new Map<string, GlobalPresenceLocation[]>();
  for (const loc of locations) {
    const key = (loc.country || "").trim() || otherLabel;
    if (!byCountry.has(key)) byCountry.set(key, []);
    byCountry.get(key)!.push(loc);
  }
  return Array.from(byCountry.entries())
    .map(([country, locs]) => {
      const cities = Array.from(new Set(locs.map((l) => (l.city || "").trim()).filter(Boolean)));
      return { country: country || otherLabel, cities, locations: locs };
    })
    .sort((a, b) => a.country.localeCompare(b.country));
}

function AnimatedCounter({
  value,
  duration = 1500,
  isInView,
}: {
  value: number;
  duration?: number;
  isInView: boolean;
}) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!isInView) {
      setDisplay(0);
      startRef.current = null;
      return;
    }
    startRef.current = null;
    const step = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const t = Math.min(elapsed / duration, 1);
      const easeOut = 1 - (1 - t) * (1 - t);
      setDisplay(Math.round(easeOut * value));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration, isInView]);

  return <span>{display}</span>;
}

export function GlobalPresenceSection({
  block,
  lang,
}: {
  block: HomeContentBlock;
  lang: "pt" | "en";
}) {
  const config = block.config ?? {};
  const sectionRef = useRef<HTMLElement>(null);
  const [countersInView, setCountersInView] = useState(false);

  const title = (lang === "pt" ? (config.titlePt as string) : (config.titleEn as string))?.trim() ?? "";
  const gradientStart = (config.titleGradientStart as string)?.trim() || "#fcd34d";
  const gradientEnd = (config.titleGradientEnd as string)?.trim() || "#ffffff";
  const titleAlign = ((config.titleAlign as "left" | "center" | "right") || "left") as "left" | "center" | "right";
  const subtitle =
    (lang === "pt" ? (config.subtitlePT as string) : (config.subtitleEN as string))?.trim() ||
    (lang === "pt" ? "Não somos locais. Somos plataforma." : "We are not local. We are a platform.");
  const description = (lang === "pt" ? (config.descriptionPT as string) : (config.descriptionEN as string))?.trim() ?? "";

  const bgColor = (config.backgroundColor as string)?.trim() || "#0a0a0f";
  const bgImage = (config.backgroundImage as string)?.trim();
  const bgOverlayOpacity = (() => {
    const v = config.backgroundOverlayOpacity;
    if (typeof v === "number" && v >= 0 && v <= 1) return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (!Number.isNaN(n) && n >= 0 && n <= 1) return n;
    }
    return 0.75;
  })();
  const accentColor = (config.accentColor as string)?.trim() || "#38bdf8";
  const mapTint = (config.mapTint as string)?.trim() || "#334155";
  const overlayOpacity = typeof config.overlayOpacity === "number" ? config.overlayOpacity : 0.4;
  const showGridLines = !!config.showGridLines;
  const sectionHeight = (config.sectionHeight as "compact" | "normal" | "tall") || "normal";

  const counters: GlobalPresenceCounter[] = Array.isArray(config.counters)
    ? config.counters.filter((c) => c?.enabled)
    : [];
  const locations: GlobalPresenceLocation[] = Array.isArray(config.locations)
    ? config.locations.filter((l) => l?.active)
    : [];
  const byCountry = groupLocationsByCountry(locations, lang);
  const byPosition = groupLocationsByPosition(locations);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setCountersInView(true);
      },
      { rootMargin: "0px 0px -80px 0px", threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const heightClass =
    sectionHeight === "compact"
      ? "py-10 sm:py-14"
      : sectionHeight === "tall"
        ? "py-20 sm:py-28"
        : "py-14 sm:py-20";

  return (
    <section
      ref={sectionRef}
      className={`relative overflow-hidden ${moduleBottomBorderClass(block.config)} ${heightClass}`}
      style={{ backgroundColor: bgColor }}
    >
      {bgImage && (
        <div className="absolute inset-0">
          <SmartImage
            src={getPublicImageUrl(bgImage)}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-zinc-950" style={{ opacity: bgOverlayOpacity }} />
        </div>
      )}
      <div className="container relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header — alinhamento do título via config (titleAlign) */}
        <div
          className={`mb-10 sm:mb-14 flex flex-col ${
            titleAlign === "center" ? "items-center text-center" : titleAlign === "right" ? "items-end text-right" : "items-start text-left"
          }`}
        >
          {title && (
            <SectionTitle
              title={title}
              gradientStart={gradientStart}
              gradientEnd={gradientEnd}
              align={titleAlign}
            />
          )}
          {subtitle && (
            <p className={`mt-3 text-base sm:text-lg text-zinc-300 font-medium ${titleAlign === "center" ? "max-w-2xl mx-auto" : titleAlign === "right" ? "ml-auto max-w-2xl" : "max-w-2xl"}`}>
              {subtitle}
            </p>
          )}
          {description && (
            <p className={`mt-2 text-sm text-zinc-400 ${titleAlign === "center" ? "max-w-xl mx-auto" : titleAlign === "right" ? "ml-auto max-w-xl" : "max-w-xl"}`}>{description}</p>
          )}
        </div>

        {/* Map + Counters layout: desktop side-by-side or stacked; mapa maior para alinhar Presença por país com a base do card Países */}
        <div className="grid gap-8 lg:grid-cols-[1fr,280px] lg:gap-10 items-start">
          {/* Mapa com tiles (OpenStreetMap): zoom até nível de cidade, como latitude.to */}
          <div className="relative w-full">
            <div className="w-full aspect-[2/1.15] min-h-[340px] sm:min-h-[420px]">
              <GlobalPresenceLeafletMap
                byPosition={byPosition}
                accentColor={accentColor}
                lang={lang}
              />
            </div>

            {/* Presença por país: lista de países com cidades onde há pontos */}
            {byCountry.length > 0 && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-3">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-2 mb-2">
                  <MapPin className="h-3.5 w-3.5" />
                  {lang === "pt" ? "Presença por país" : "Presence by country"}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  {byCountry.map(({ country, cities, locations: locs }) => (
                    <span key={country} className="text-zinc-300 inline-flex items-center gap-1.5">
                      <strong className="font-medium text-white">{country}</strong>
                      <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded text-xs font-medium bg-white/10 text-zinc-300">
                        {locs.length}
                      </span>
                      {cities.length > 0 && (
                        <span className="text-zinc-500">
                          ({cities.join(", ")})
                        </span>
                      )}
                      {cities.length === 0 && locs.length > 0 && (
                        <span className="text-zinc-500">
                          ({lang === "pt" ? "ponto(s)" : "location(s)"})
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Counters */}
          {counters.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              {counters.map((c) => (
                <div
                  key={c.key}
                  className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-5 py-4 text-center"
                >
                  <div
                    className="text-2xl sm:text-3xl font-bold tabular-nums transition-colors"
                    style={{ color: accentColor }}
                  >
                    <AnimatedCounter value={c.value} isInView={countersInView} />
                  </div>
                  <p className="mt-1 text-xs sm:text-sm text-zinc-400">
                    {lang === "pt" ? c.labelPT : c.labelEN}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
