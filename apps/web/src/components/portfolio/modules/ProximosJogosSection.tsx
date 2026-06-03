"use client";

import { useState, useEffect, useMemo } from "react";
import type { HomeContentBlock } from "@/types/home-content";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Image from "next/image";
import { getPublicImageUrl, isSvgUrl, resolvePublicMediaUrlForDisplay } from "@/lib/media-url";
import { moduleBottomBorderClass } from "@/lib/module-section-border";
import { moduleSectionContainerClass } from "@/lib/module-section-container";
import { SmartImage } from "@/components/common/SmartImage";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import { Calendar, MapPin, Tv, Ticket, Home, Plane, Building2 } from "lucide-react";
import { FIXTURE_CATEGORIES, getCategoryLabel } from "@/lib/fixture-categories";
import {
  fetchFixtures as fetchFixturesShared,
  type FixturesFetchContext,
} from "@/lib/fixtures-shared";
import {
  ProximosJogosMobileCarousel,
  ProximosJogosVenuePills,
} from "@/components/portfolio/modules/ProximosJogosMobile";
import { HorizontalScrollCarousel } from "@/components/portfolio/HorizontalScrollCarousel";

export interface FixtureItem {
  externalId: string;
  startISO: string;
  status: "SCHEDULED" | "LIVE" | "FINAL";
  competitionName: string;
  competitionLogoUrl?: string;
  venueName?: string;
  homeTeamName: string;
  awayTeamName: string;
  watchUrl?: string;
  ticketUrl?: string;
  featured?: boolean;
  category?: string;
  /** Manual: posição do clube (true = casa, false = fora). */
  isOurTeamHome?: boolean;
  /** Manual: logo do time da casa. */
  homeTeamLogoUrl?: string;
  /** Manual: logo do time visitante. */
  awayTeamLogoUrl?: string;
}

function formatDate(iso: string, lang: "pt" | "en"): string {
  const d = new Date(iso);
  const dateStr = d.toLocaleDateString(lang === "pt" ? "pt-BR" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeStr = d.toLocaleTimeString(lang === "pt" ? "pt-BR" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateStr} · ${timeStr}`;
}

/** Retorna apenas a data no formato YYYY-MM-DD para agrupar/calendário. */
function dateKey(iso: string): string {
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

/** Data em destaque no card: "14 SÁB · 15:30" (dia + dia da semana + horário). */
function formatBigDate(iso: string, lang: "pt" | "en"): string {
  const d = new Date(iso);
  const day = d.getDate();
  const weekday = d.toLocaleDateString(lang === "pt" ? "pt-BR" : "en-GB", {
    weekday: "short",
  })
    .replace(/\./g, "")
    .toUpperCase()
    .slice(0, 3);
  const time = d.toLocaleTimeString(lang === "pt" ? "pt-BR" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day} ${weekday} · ${time}`;
}

/** Slug para pasta de logos externos: minúsculo, hífens, sem acentos. */
function slugFromTeamName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/** "Nosso Clube" / "Our Club" = placeholder do clube da página (sempre nosso time). */
const OUR_CLUB_PLACEHOLDERS = ["nosso clube", "our club"];

/** Compara se o nome do time é o nosso (página/tenant). */
function isOurTeam(teamName: string, ourTeamName: string | null | undefined): boolean {
  const a = teamName.trim().toLowerCase();
  if (OUR_CLUB_PLACEHOLDERS.includes(a)) return true;
  if (!ourTeamName?.trim()) return false;
  const b = ourTeamName.trim().toLowerCase();
  if (a === b) return true;
  return a.includes(b) || b.includes(a);
}

function resolveDisplayTeamName(
  teamName: string,
  ourTeamName: string | null | undefined,
): string {
  return isOurTeam(teamName, ourTeamName) && ourTeamName?.trim()
    ? ourTeamName.trim()
    : teamName;
}

/** Fonte menor conforme o nome mais longo do confronto — mesma linha, sem logos. */
function matchupNamesTextClass(homeName: string, awayName: string): string {
  const len = Math.max(homeName.length, awayName.length);
  const size =
    len <= 14 ? "text-sm" :
    len <= 20 ? "text-xs" :
    len <= 28 ? "text-[11px]" :
    len <= 36 ? "text-[10px]" :
    "text-[9px]";
  return `${size} font-semibold text-white leading-tight break-words min-w-0 flex-1 text-center`;
}

const EXTERNAL_LOGO_EXTENSIONS = [".png", ".webp", ".svg"] as const;

/** Tamanho fixo de todos os logos nos cards (casa e visitante) para ficarem uniformes. */
const FIXTURE_LOGO_SIZE = 40;

function TeamLogo({
  teamName,
  ourTeamName,
  ourTeamLogoUrl,
  logoUrlOverride,
  size: sizeProp,
}: {
  teamName: string;
  ourTeamName: string | null | undefined;
  ourTeamLogoUrl: string | null | undefined;
  logoUrlOverride?: string | null;
  size?: number;
}) {
  const size = sizeProp ?? FIXTURE_LOGO_SIZE;
  const [externalExtIndex, setExternalExtIndex] = useState(0);
  const [showPlaceholder, setShowPlaceholder] = useState(false);

  const logoBoxClass = "relative shrink-0 overflow-hidden rounded-lg bg-zinc-800 flex items-center justify-center";
  const logoBoxStyle = { width: size, height: size, minWidth: size, minHeight: size };

  if (logoUrlOverride?.trim()) {
    const src = resolvePublicMediaUrlForDisplay(logoUrlOverride);
    if (src) {
      const useImg = isSvgUrl(logoUrlOverride);
      return (
        <div className={logoBoxClass} style={logoBoxStyle}>
          {useImg ? (
            <img
              src={src}
              alt=""
              width={size}
              height={size}
              className="object-contain max-h-full max-w-full"
            />
          ) : (
            <SmartImage
              src={src}
              alt=""
              width={size}
              height={size}
              className="object-contain max-h-full max-w-full"
            />
          )}
        </div>
      );
    }
  }

  const isOurs = isOurTeam(teamName, ourTeamName);
  const slug = slugFromTeamName(teamName);

  if (isOurs && ourTeamLogoUrl) {
    const src = getPublicImageUrl(ourTeamLogoUrl);
    if (src) {
      const useImg = isSvgUrl(ourTeamLogoUrl);
      return (
        <div className={logoBoxClass} style={logoBoxStyle}>
          {useImg ? (
            <img
              src={src}
              alt=""
              width={size}
              height={size}
              className="object-contain max-h-full max-w-full"
            />
          ) : (
            <SmartImage
              src={src}
              alt=""
              width={size}
              height={size}
              className="object-contain max-h-full max-w-full"
            />
          )}
        </div>
      );
    }
  }

  if (isOurs) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-lg bg-zinc-700 text-zinc-400"
        style={logoBoxStyle}
      >
        <Building2 className="h-5 w-5" aria-hidden />
      </div>
    );
  }

  const base = "/logos/teams-externos/" + slug;
  const externalSrc = base + EXTERNAL_LOGO_EXTENSIONS[externalExtIndex];

  if (showPlaceholder) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-lg bg-zinc-700 text-zinc-400"
        style={logoBoxStyle}
      >
        <Building2 className="h-5 w-5" aria-hidden />
      </div>
    );
  }

  const useImg = isSvgUrl(externalSrc);
  return (
    <div className={logoBoxClass} style={logoBoxStyle}>
      {useImg ? (
        <img
          src={externalSrc}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-contain max-h-[100%] max-w-[100%]"
          onError={() => {
            if (externalExtIndex < EXTERNAL_LOGO_EXTENSIONS.length - 1) {
              setExternalExtIndex((i) => i + 1);
            } else {
              setShowPlaceholder(true);
            }
          }}
        />
      ) : (
        <Image
          src={externalSrc}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-contain max-h-[100%] max-w-[100%]"
          unoptimized
          onError={() => {
            if (externalExtIndex < EXTERNAL_LOGO_EXTENSIONS.length - 1) {
              setExternalExtIndex((i) => i + 1);
            } else {
              setShowPlaceholder(true);
            }
          }}
        />
      )}
    </div>
  );
}

export function ProximosJogosSection({
  block,
  slug,
  lang,
  ourTeamName,
  ourTeamLogoUrl,
  fullWidth,
  titleAlign = "left",
  inSection,
  sectionColumns,
  showTitle = true,
  fixturesContext = "tenant",
  competitionDisplayFallback,
  lockedEventFixtureCategory,
  eventPageLogoUrl,
}: {
  block: HomeContentBlock;
  slug: string;
  lang: "pt" | "en";
  ourTeamName?: string | null;
  ourTeamLogoUrl?: string | null;
  fullWidth?: boolean;
  titleAlign?: "left" | "center" | "right";
  inSection?: boolean;
  sectionColumns?: 1 | 2 | 3;
  showTitle?: boolean;
  /** `event` = GET /api/public/events/:slug/fixtures (página de evento). */
  fixturesContext?: FixturesFetchContext;
  /** Página do evento: exibir quando `competitionName` do jogo estiver vazio (ex.: nome do evento). */
  competitionDisplayFallback?: string | null;
  /** Página do evento: categoria única do cadastro — sem filtro “Todas”, só este rótulo/filtro. */
  lockedEventFixtureCategory?: string | null;
  /** Página do evento: logo no canto superior direito do card. */
  eventPageLogoUrl?: string | null;
}) {
  const [fixtures, setFixtures] = useState<FixtureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<"home" | "away" | null>(null);
  const [tenantBySlug, setTenantBySlug] = useState<{ name: string; logoUrl: string | null } | null>(null);

  const displayOurTeamName = tenantBySlug?.name ?? ourTeamName ?? undefined;
  const displayOurTeamLogoUrl = tenantBySlug?.logoUrl ?? ourTeamLogoUrl ?? undefined;

  const title =
    (lang === "pt" ? block.config?.titlePt : block.config?.titleEn) as string;
  const bgColor = (block.config?.backgroundColor as string)?.trim() || undefined;
  const bgImage = (block.config?.backgroundImage as string)?.trim();
  const overlayOpacity = (() => {
    const v = block.config?.backgroundOverlayOpacity;
    if (typeof v === "number" && v >= 0 && v <= 1) return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (!Number.isNaN(n) && n >= 0 && n <= 1) return n;
    }
    return 0.75;
  })();
  const paddingTop = (block.config?.proximosJogosPaddingTop as "minimal" | "compact" | "normal" | "large") || "compact";
  const paddingBottom = (block.config?.proximosJogosPaddingBottom as "minimal" | "compact" | "normal" | "large") || "compact";

  const paddingTopClass =
    paddingTop === "minimal" ? "pt-4 sm:pt-5" : paddingTop === "compact" ? "pt-6 sm:pt-8" : paddingTop === "large" ? "pt-20 sm:pt-24" : "pt-12 sm:pt-16";
  const paddingBottomClass =
    paddingBottom === "minimal" ? "pb-4 sm:pb-5" : paddingBottom === "compact" ? "pb-6 sm:pb-8" : paddingBottom === "large" ? "pb-20 sm:pb-24" : "pb-12 sm:pb-16";

  useEffect(() => {
    let cancelled = false;
    fetchFixturesShared(slug, fixturesContext).then((list) => {
      if (!cancelled) {
        setFixtures(list);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [slug, fixturesContext]);

  useEffect(() => {
    if (!slug?.trim() || fixturesContext === "event") return;
    let cancelled = false;
    fetch(`/api/public/tenants/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { name?: string; logoUrl?: string | null } | null) => {
        if (cancelled || !data) return;
        setTenantBySlug({
          name: (data.name && String(data.name).trim()) || "",
          logoUrl: data.logoUrl != null ? String(data.logoUrl) : null,
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [slug, fixturesContext]);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, []);
  const upcomingFixtures = useMemo(
    () => fixtures.filter((f) => new Date(f.startISO) > new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tick forces re-run every 60s so past fixtures drop off
    [fixtures, tick],
  );

  const datesWithGames = useMemo(() => {
    const set = new Set<string>();
    upcomingFixtures.forEach((f) => set.add(dateKey(f.startISO)));
    return Array.from(set).sort();
  }, [upcomingFixtures]);

  /** Categorias para o filtro: tenant — lista completa; evento — não usa select. */
  const categoriesForFilter = useMemo(
    () => FIXTURE_CATEGORIES.map((c) => c.value),
    [],
  );

  /** Página do evento: categoria do cadastro ou, se única nos jogos, inferida (nunca dropdown). */
  const inferredEventCategory = useMemo(() => {
    if (fixturesContext !== "event") return null;
    const cats = new Set(
      upcomingFixtures.map((f) => (f.category ?? "principal") as string),
    );
    if (cats.size !== 1) return null;
    return Array.from(cats)[0] ?? null;
  }, [fixturesContext, upcomingFixtures]);

  const resolvedEventCategory =
    fixturesContext === "event"
      ? (lockedEventFixtureCategory?.trim() || inferredEventCategory || null)
      : null;

  const categoryFilterActive =
    fixturesContext === "event"
      ? resolvedEventCategory
      : selectedCategory;

  const isHomeFixture = (f: FixtureItem) =>
    f.isOurTeamHome !== undefined ? f.isOurTeamHome : isOurTeam(f.homeTeamName, displayOurTeamName);

  const showVenueFilter = fixturesContext !== "event" && Boolean(displayOurTeamName?.trim());

  const filteredFixtures = useMemo(() => {
    let list = upcomingFixtures;
    if (selectedDate) {
      list = list.filter((f) => dateKey(f.startISO) === selectedDate);
    }
    if (categoryFilterActive) {
      list = list.filter(
        (f) => (f.category ?? "principal") === categoryFilterActive,
      );
    }
    if (showVenueFilter && selectedVenue === "home") {
      list = list.filter((f) => isHomeFixture(f));
    } else if (showVenueFilter && selectedVenue === "away") {
      list = list.filter((f) => !isHomeFixture(f));
    }
    return list;
  }, [upcomingFixtures, selectedDate, categoryFilterActive, showVenueFilter, selectedVenue, displayOurTeamName]);

  const isHome = isHomeFixture;
  const homeAwayLabel = (f: FixtureItem) =>
    isHome(f)
      ? (lang === "pt" ? "Casa" : "Home")
      : (lang === "pt" ? "Fora" : "Away");

  const cardClassName =
    `min-w-[280px] max-w-[320px] shrink-0 snap-start rounded-xl bg-zinc-900/60 p-4 transition sm:min-w-[300px] ${fullWidth ? "" : "border border-white/10 hover:border-white/20"}`;

  const eventCardLogoRaw =
    fixturesContext === "event" ? (eventPageLogoUrl?.trim() || "") : "";
  const eventCardLogoSrc = eventCardLogoRaw ? getPublicImageUrl(eventCardLogoRaw) : "";

  return (
    <section
      className={`relative overflow-hidden ${moduleBottomBorderClass(block.config)} ${paddingTopClass} ${paddingBottomClass}`}
      style={bgColor ? { backgroundColor: bgColor } : undefined}
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
          <div className="absolute inset-0 bg-zinc-950" style={{ opacity: overlayOpacity }} />
        </div>
      )}
      <div className={moduleSectionContainerClass({ fullWidth })}>
        {showTitle && title && (
          <SectionTitle
            title={title}
            gradientStart={(block.config?.titleGradientStart as string)?.trim()}
            gradientEnd={(block.config?.titleGradientEnd as string)?.trim()}
            align={titleAlign}
          />
        )}

        {loading ? (
          <div className="flex justify-center py-12 text-zinc-500">
            <span>{lang === "pt" ? "Carregando jogos…" : "Loading fixtures…"}</span>
          </div>
        ) : upcomingFixtures.length === 0 ? (
          <div className={`rounded-xl bg-zinc-900/60 px-6 py-12 text-center text-zinc-400 ${fullWidth ? "" : "border border-white/10"}`}>
            <Calendar className="mx-auto h-12 w-12 opacity-50 mb-3" />
            <p>
              {fixtures.length > 0
                ? (lang === "pt" ? "Nenhum próximo jogo no momento." : "No upcoming fixtures.")
                : (lang === "pt" ? "Nenhum jogo cadastrado no momento." : "No fixtures at the moment.")}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop — filtros completos */}
            <div className="mb-6 hidden flex-wrap items-center justify-center gap-4 md:flex">
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">{lang === "pt" ? "Data:" : "Date:"}</span>
              <Select value={selectedDate ?? "all"} onValueChange={(v) => setSelectedDate(v === "all" ? null : v)}>
                <SelectTrigger className="w-[140px] h-9 border-white/20 bg-zinc-900/60 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{lang === "pt" ? "Todas" : "All"}</SelectItem>
                  {datesWithGames.map((d) => {
                    const [y, m, day] = d.split("-");
                    const dateObj = new Date(Number(y), Number(m) - 1, Number(day));
                    const label = dateObj.toLocaleDateString(lang === "pt" ? "pt-BR" : "en-GB", { day: "numeric", month: "short" });
                    return <SelectItem key={d} value={d}>{label}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500">{lang === "pt" ? "Categoria:" : "Category:"}</span>
              {fixturesContext === "event" ? (
                <span className="inline-flex min-h-9 items-center rounded-md border border-white/20 bg-zinc-900/60 px-3 text-sm font-medium text-white">
                  {resolvedEventCategory
                    ? getCategoryLabel(resolvedEventCategory, lang)
                    : (lang === "pt" ? "Todas" : "All")}
                </span>
              ) : (
                <Select value={selectedCategory ?? "all"} onValueChange={(v) => setSelectedCategory(v === "all" ? null : v)}>
                  <SelectTrigger className="w-[140px] h-9 border-white/20 bg-zinc-900/60 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{lang === "pt" ? "Todas" : "All"}</SelectItem>
                    {categoriesForFilter.map((cat) => (
                      <SelectItem key={cat} value={cat}>{getCategoryLabel(cat, lang)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {showVenueFilter && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500">{lang === "pt" ? "Local:" : "Venue:"}</span>
                <Select
                  value={selectedVenue ?? "all"}
                  onValueChange={(v) =>
                    setSelectedVenue(v === "all" ? null : (v as "home" | "away"))
                  }
                >
                  <SelectTrigger className="h-9 w-[120px] border-white/20 bg-zinc-900/60 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{lang === "pt" ? "Todos" : "All"}</SelectItem>
                    <SelectItem value="home">{lang === "pt" ? "Casa" : "Home"}</SelectItem>
                    <SelectItem value="away">{lang === "pt" ? "Fora" : "Away"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            </div>

            {/* Mobile — só Casa / Fora / Todos */}
            <div className="md:hidden">
              <ProximosJogosVenuePills
                lang={lang}
                show={showVenueFilter}
                value={selectedVenue ?? "all"}
                onChange={(v) => setSelectedVenue(v === "all" ? null : v)}
              />
            </div>
          </>
        )}
      </div>

      {!loading && upcomingFixtures.length > 0 && filteredFixtures.length === 0 && (
        <div className={`mx-auto max-w-lg px-4 py-8 text-center text-sm text-zinc-500 ${moduleSectionContainerClass({ fullWidth })}`}>
          {lang === "pt" ? "Nenhum jogo com esses filtros." : "No fixtures match these filters."}
        </div>
      )}

      {/* Mobile — cards estilo ingresso, swipe manual */}
      {!loading && filteredFixtures.length > 0 && (
        <div className={`md:hidden ${moduleSectionContainerClass({ fullWidth })}`}>
          <ProximosJogosMobileCarousel
            fixtures={filteredFixtures}
            lang={lang}
            resolveDisplayTeamName={(name) => resolveDisplayTeamName(name, displayOurTeamName)}
            isHome={isHome}
            homeAwayLabel={homeAwayLabel}
            fixturesContext={fixturesContext}
            competitionDisplayFallback={competitionDisplayFallback}
            fullWidth={fullWidth}
          />
        </div>
      )}

      {/* Desktop — scroll horizontal com setas e arrastar */}
      {!loading && filteredFixtures.length > 0 && (
        <div className="mt-6 hidden w-full md:block">
          <HorizontalScrollCarousel lang={lang} gap={16}>
                {filteredFixtures.map((f, index) => {
                  const competitionLabel =
                    (f.competitionName && String(f.competitionName).trim()) ||
                    (competitionDisplayFallback && String(competitionDisplayFallback).trim()) ||
                    "";
                  return (
                  <div
                    key={`${f.externalId}-${index}`}
                    className={`${cardClassName} relative`}
                  >
                    {/* Topo: competição + categoria + data à esquerda; evento: logo à direita; tenant: Casa/Fora */}
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {competitionLabel && (
                            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                              {competitionLabel}
                            </span>
                          )}
                          <span className="text-xs font-medium text-amber-400/90">
                            {getCategoryLabel(f.category ?? "principal", lang)}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {eventCardLogoSrc ? (
                          <div
                            className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-zinc-800/80"
                            aria-label={competitionDisplayFallback ?? competitionLabel ?? undefined}
                          >
                            {isSvgUrl(eventCardLogoRaw) ? (
                              // eslint-disable-next-line @next/next/no-img-element -- SVG externo
                              <img
                                src={eventCardLogoSrc}
                                alt=""
                                width={40}
                                height={40}
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <SmartImage
                                src={eventCardLogoSrc}
                                alt=""
                                width={40}
                                height={40}
                                className="max-h-full max-w-full object-contain"
                              />
                            )}
                          </div>
                        ) : null}
                        {fixturesContext !== "event" && (
                          <span
                            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs ${
                              isHome(f)
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-sky-500/15 text-sky-300"
                            }`}
                          >
                            {isHome(f) ? (
                              <Home className="h-3 w-3" />
                            ) : (
                              <Plane className="h-3 w-3" />
                            )}
                            {homeAwayLabel(f)}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Data em destaque */}
                    <div className="mb-3 text-2xl font-bold text-white">
                      {formatBigDate(f.startISO, lang)}
                    </div>
                    {/* Times — só nomes na mesma linha (sem logos) */}
                    <div className="mb-4 flex min-w-0 items-center gap-1.5">
                      <span
                        className={matchupNamesTextClass(
                          resolveDisplayTeamName(f.homeTeamName, displayOurTeamName),
                          resolveDisplayTeamName(f.awayTeamName, displayOurTeamName),
                        )}
                      >
                        {resolveDisplayTeamName(f.homeTeamName, displayOurTeamName)}
                      </span>
                      <span className="shrink-0 text-[10px] text-zinc-500">×</span>
                      <span
                        className={matchupNamesTextClass(
                          resolveDisplayTeamName(f.homeTeamName, displayOurTeamName),
                          resolveDisplayTeamName(f.awayTeamName, displayOurTeamName),
                        )}
                      >
                        {resolveDisplayTeamName(f.awayTeamName, displayOurTeamName)}
                      </span>
                    </div>
                    {/* CTA + local: ambos botões quando ambas URLs existirem */}
                    <div className="flex flex-col gap-2">
                      {f.status === "LIVE" && f.watchUrl && (
                        <a
                          href={f.watchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <Button
                            size="sm"
                            className="w-full bg-amber-500 text-black hover:bg-amber-400"
                          >
                            <Tv className="mr-1.5 h-4 w-4" />
                            {lang === "pt" ? "Assistir ao vivo" : "Watch Live"}
                          </Button>
                        </a>
                      )}
                      {f.status !== "LIVE" && (
                        <>
                          {f.ticketUrl && (
                            <a
                              href={f.ticketUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <Button
                                size="sm"
                                className="w-full bg-red-600 text-white hover:bg-red-500"
                              >
                                <Ticket className="mr-1.5 h-4 w-4" />
                                {lang === "pt" ? "Comprar ingresso" : "Buy ticket"}
                              </Button>
                            </a>
                          )}
                          {f.watchUrl && (
                            <a
                              href={f.watchUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <Button
                                size="sm"
                                variant={f.ticketUrl ? "outline" : "default"}
                                className={
                                  f.ticketUrl
                                    ? "w-full border-white/20 text-white hover:bg-white/10"
                                    : "w-full bg-amber-500 text-black hover:bg-amber-400"
                                }
                              >
                                <Tv className="mr-1.5 h-4 w-4" />
                                {lang === "pt" ? "Assistir ao jogo" : "Watch"}
                              </Button>
                            </a>
                          )}
                        </>
                      )}
                      {f.venueName && (
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {f.venueName}
                        </span>
                      )}
                    </div>
                  </div>
                );
                })}
          </HorizontalScrollCarousel>
        </div>
      )}
    </section>
  );
}
