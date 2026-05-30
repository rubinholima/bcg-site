"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import type { HomeContentBlock } from "@/types/home-content";
import type { FixtureItem } from "@/lib/fixtures-shared";
import { fetchFixtures, type FixturesFetchContext } from "@/lib/fixtures-shared";
import { fixturesMarqueeDurationSeconds } from "@/lib/fixtures-marquee";
import { getPublicImageUrl, isSvgUrl } from "@/lib/media-url";
import { moduleBottomBorderClass } from "@/lib/module-section-border";
import { SmartImage } from "@/components/common/SmartImage";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import { FixtureTeamLogo, isOurTeam } from "@/components/portfolio/FixtureTeamLogo";
import { FIXTURE_CATEGORIES, getCategoryLabel } from "@/lib/fixture-categories";
import { Trophy, Calendar, MapPin, Tv, ChevronLeft, ChevronRight, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatDate(iso: string, lang: "pt" | "en"): string {
  const d = new Date(iso);
  return d.toLocaleDateString(lang === "pt" ? "pt-BR" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string, lang: "pt" | "en"): string {
  const d = new Date(iso);
  const dateStr = d.toLocaleDateString(lang === "pt" ? "pt-BR" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const timeStr = d.toLocaleTimeString(lang === "pt" ? "pt-BR" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateStr} · ${timeStr}`;
}

type ResultadosManuais = Record<string, { homeScore: number; awayScore: number }>;

type GoalDetail = { minute: number; scorerName: string; team: string };
type CardDetail = { minute: number; playerName: string; team: string };
type SubstitutionDetail = { minute: number; playerOut: string; playerIn: string; team: string };
type PenaltyDetail = { minute: number; playerName: string; team: string; scored: boolean };
type MatchStats = Record<string, number>;

function FixtureDetailsModal({
  fixture,
  score,
  weWon,
  goals,
  redCards,
  yellowCards,
  substitutions,
  penalties,
  formations,
  stats,
  videoUrls,
  ourTeamName,
  ourTeamLogoUrl,
  lang,
  onClose,
  competitionDisplayFallback,
}: {
  fixture: FixtureItem;
  score: { home: number; away: number } | null;
  weWon: boolean | null;
  goals: GoalDetail[];
  redCards: CardDetail[];
  yellowCards?: CardDetail[];
  substitutions?: SubstitutionDetail[];
  penalties?: PenaltyDetail[];
  formations?: { home?: string; away?: string };
  stats?: MatchStats;
  videoUrls?: string[];
  ourTeamName?: string | null;
  ourTeamLogoUrl?: string | null;
  lang: "pt" | "en";
  onClose: () => void;
  competitionDisplayFallback?: string | null;
}) {
  const competitionLine =
    (fixture.competitionName && String(fixture.competitionName).trim()) ||
    (competitionDisplayFallback && String(competitionDisplayFallback).trim()) ||
    "";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white"
          aria-label={lang === "pt" ? "Fechar" : "Close"}
        >
          <X className="h-5 w-5" />
        </button>
        <div className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">
            {lang === "pt" ? "Detalhes do jogo" : "Match details"}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-amber-400">
              {getCategoryLabel(fixture.category ?? "principal", lang)}
              {competitionLine && (
                <>
                  <span className="text-zinc-500">·</span>
                  <span className="text-zinc-400">{competitionLine}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-300">
              <Calendar className="h-4 w-4 shrink-0" />
              {formatDateTime(fixture.startISO, lang)}
            </div>
            {fixture.venueName && (
              <div className="flex items-center gap-2 text-sm text-zinc-300">
                <MapPin className="h-4 w-4 shrink-0" />
                {fixture.venueName}
              </div>
            )}
            <div className="flex items-center justify-center gap-4 py-4">
              <div className="flex flex-1 items-center gap-2">
                <FixtureTeamLogo
                  teamName={fixture.homeTeamName}
                  ourTeamName={ourTeamName}
                  ourTeamLogoUrl={ourTeamLogoUrl}
                  logoUrlOverride={fixture.homeTeamLogoUrl}
                  size={48}
                />
                <span className="text-sm font-medium text-white">{fixture.homeTeamName}</span>
              </div>
              <div className="flex shrink-0 items-center justify-center rounded-xl bg-white/10 px-5 py-2">
                {score ? (
                  <span className="text-xl font-bold tabular-nums text-white">
                    {score.home} <span className="text-zinc-500">–</span> {score.away}
                  </span>
                ) : (
                  <span className="text-zinc-500">–</span>
                )}
              </div>
              <div className="flex flex-1 items-center gap-2 justify-end">
                <span className="text-sm font-medium text-white">{fixture.awayTeamName}</span>
                <FixtureTeamLogo
                  teamName={fixture.awayTeamName}
                  ourTeamName={ourTeamName}
                  ourTeamLogoUrl={ourTeamLogoUrl}
                  logoUrlOverride={fixture.awayTeamLogoUrl}
                  size={48}
                />
              </div>
            </div>
            {weWon !== null && (
              <div
                className={`rounded-lg px-3 py-2 text-center text-sm font-medium ${
                  weWon ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                }`}
              >
                {weWon ? (lang === "pt" ? "Vitória" : "Win") : (lang === "pt" ? "Derrota" : "Loss")}
              </div>
            )}
            <div className="space-y-3 border-t border-white/10 pt-4">
              {goals.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">{lang === "pt" ? "Gols" : "Goals"}</h4>
                  <ul className="space-y-1 text-sm text-zinc-300">
                    {goals
                      .sort((a, b) => a.minute - b.minute)
                      .map((g, i) => (
                        <li key={i}>
                          {g.minute}&apos; — {g.scorerName}
                          <span className="text-zinc-500 ml-1">
                            ({g.team === "home" ? fixture.homeTeamName : fixture.awayTeamName})
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {redCards.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">{lang === "pt" ? "Expulsões" : "Red cards"}</h4>
                  <ul className="space-y-1 text-sm text-red-300/90">
                    {redCards
                      .sort((a, b) => a.minute - b.minute)
                      .map((r, i) => (
                        <li key={i}>
                          {r.minute}&apos; — {r.playerName}
                          <span className="text-zinc-500 ml-1">
                            ({r.team === "home" ? fixture.homeTeamName : fixture.awayTeamName})
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {(yellowCards?.length ?? 0) > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">{lang === "pt" ? "Cartões amarelos" : "Yellow cards"}</h4>
                  <ul className="space-y-1 text-sm text-amber-300/90">
                    {yellowCards!
                      .sort((a, b) => a.minute - b.minute)
                      .map((r, i) => (
                        <li key={i}>
                          {r.minute}&apos; — {r.playerName}
                          <span className="text-zinc-500 ml-1">
                            ({r.team === "home" ? fixture.homeTeamName : fixture.awayTeamName})
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {(substitutions?.length ?? 0) > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">{lang === "pt" ? "Substituições" : "Substitutions"}</h4>
                  <ul className="space-y-1 text-sm text-zinc-300">
                    {substitutions!
                      .sort((a, b) => a.minute - b.minute)
                      .map((s, i) => (
                        <li key={i}>
                          {s.minute}&apos; — {s.playerOut} → {s.playerIn}
                          <span className="text-zinc-500 ml-1">
                            ({s.team === "home" ? fixture.homeTeamName : fixture.awayTeamName})
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {(penalties?.length ?? 0) > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">{lang === "pt" ? "Pênaltis" : "Penalties"}</h4>
                  <ul className="space-y-1 text-sm text-zinc-300">
                    {penalties!
                      .sort((a, b) => a.minute - b.minute)
                      .map((p, i) => (
                        <li key={i}>
                          {p.minute}&apos; — {p.playerName}
                          <span className={p.scored ? "text-emerald-300" : "text-red-300/90"}>
                            {p.scored ? " ✓" : " ✗"}
                          </span>
                          <span className="text-zinc-500 ml-1">
                            ({p.team === "home" ? fixture.homeTeamName : fixture.awayTeamName})
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {((formations?.home || formations?.away) || (stats?.possessionHome != null || stats?.possessionAway != null) || (stats?.xgHome != null || stats?.xgAway != null)) && (
                <div className="rounded-lg border border-white/10 p-3 space-y-2">
                  <h4 className="text-sm font-medium text-white">{lang === "pt" ? "Estatísticas" : "Statistics"}</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {(formations?.home || formations?.away) && (
                      <div className="col-span-2 flex gap-4">
                        {formations.home && <span><span className="text-zinc-500">{fixture.homeTeamName}:</span> {formations.home}</span>}
                        {formations.away && <span><span className="text-zinc-500">{fixture.awayTeamName}:</span> {formations.away}</span>}
                      </div>
                    )}
                    {stats?.possessionHome != null && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">{lang === "pt" ? "Posse" : "Possession"}</span>
                        <span>{stats.possessionHome ?? 0}% — {stats.possessionAway ?? 0}%</span>
                      </div>
                    )}
                    {stats?.shotsOnTargetHome != null && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">{lang === "pt" ? "Finaliz. no alvo" : "Shots on target"}</span>
                        <span>{stats.shotsOnTargetHome ?? 0} — {stats.shotsOnTargetAway ?? 0}</span>
                      </div>
                    )}
                    {stats?.xgHome != null && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">xG</span>
                        <span>{(stats.xgHome ?? 0).toFixed(2)} — {(stats.xgAway ?? 0).toFixed(2)}</span>
                      </div>
                    )}
                    {stats?.distanceHome != null && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">{lang === "pt" ? "Distância (km)" : "Distance (km)"}</span>
                        <span>{(stats.distanceHome ?? 0).toFixed(1)} — {(stats.distanceAway ?? 0).toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {(videoUrls?.length ?? 0) > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-white mb-2">{lang === "pt" ? "Vídeos" : "Videos"}</h4>
                  <div className="flex flex-wrap gap-2">
                    {videoUrls!.filter(Boolean).map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="border-white/20">
                          <Tv className="mr-1.5 h-4 w-4" />
                          {lang === "pt" ? "Assistir" : "Watch"} {i + 1}
                        </Button>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {fixture.watchUrl && (
                <div className="flex flex-wrap gap-2">
                  <a href={fixture.watchUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="border-white/20">
                      <Tv className="mr-1.5 h-4 w-4" />
                      {lang === "pt" ? "Assistir transmissão / replay" : "Watch broadcast / replay"}
                    </Button>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UltimosResultadosSection({
  block,
  slug,
  lang,
  ourTeamName,
  ourTeamLogoUrl,
  fullWidth,
  titleAlign = "left",
  inSection,
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
  showTitle?: boolean;
  fixturesContext?: FixturesFetchContext;
  competitionDisplayFallback?: string | null;
  lockedEventFixtureCategory?: string | null;
  eventPageLogoUrl?: string | null;
}) {
  const [fixtures, setFixtures] = useState<FixtureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [detailsFixture, setDetailsFixture] = useState<FixtureItem | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [carouselHover, setCarouselHover] = useState(false);
  const [tenantBySlug, setTenantBySlug] = useState<{ name: string; logoUrl: string | null } | null>(null);

  const slugAsName = slug?.trim()
    ? slug.trim().replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "";
  const displayOurTeamName =
    tenantBySlug?.name ??
    ourTeamName ??
    (fixturesContext === "event" ? undefined : slugAsName || undefined);
  const displayOurTeamLogoUrl = tenantBySlug?.logoUrl ?? ourTeamLogoUrl ?? undefined;

  const title = (lang === "pt" ? block.config?.titlePt : block.config?.titleEn) as string;
  const blockBg = (block.config?.backgroundColor as string)?.trim();
  const blockBgImg = (block.config?.backgroundImage as string)?.trim();
  const bgColor = blockBg || undefined;
  const bgImage = blockBgImg || undefined;
  const overlayOpacity = (() => {
    const v = block.config?.backgroundOverlayOpacity;
    if (typeof v === "number" && v >= 0 && v <= 1) return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (!Number.isNaN(n) && n >= 0 && n <= 1) return n;
    }
    return 0.75;
  })();
  const maxItems = (block.config?.ultimosResultadosMaxItems as number) ?? 10;
  const padTop = (block.config?.ultimosResultadosPaddingTop as "minimal" | "compact" | "normal" | "large") ?? "compact";
  const padBottom = (block.config?.ultimosResultadosPaddingBottom as "minimal" | "compact" | "normal" | "large") ?? "compact";
  const resultadosManuais = (block.config?.resultadosManuais as ResultadosManuais | undefined) ?? {};

  const paddingTopClass =
    padTop === "minimal" ? "pt-4 sm:pt-5" : padTop === "compact" ? "pt-6 sm:pt-8" : padTop === "large" ? "pt-20 sm:pt-24" : "pt-12 sm:pt-16";
  const paddingBottomClass =
    padBottom === "minimal" ? "pb-4 sm:pb-5" : padBottom === "compact" ? "pb-6 sm:pb-8" : padBottom === "large" ? "pb-20 sm:pb-24" : "pb-12 sm:pb-16";

  useEffect(() => {
    let cancelled = false;
    fetchFixtures(slug, fixturesContext).then((list) => {
      if (!cancelled) {
        setFixtures(list);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
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

  const pastFixtures = useMemo(() => {
    const now = new Date();
    return fixtures
      .filter((f) => new Date(f.startISO) < now)
      .sort((a, b) => new Date(b.startISO).getTime() - new Date(a.startISO).getTime());
  }, [fixtures]);

  const categoriesForFilter = useMemo(() => FIXTURE_CATEGORIES.map((c) => c.value), []);

  const inferredEventCategory = useMemo(() => {
    if (fixturesContext !== "event") return null;
    const cats = new Set(
      pastFixtures.map((f) => (f.category ?? "principal") as string),
    );
    if (cats.size !== 1) return null;
    return Array.from(cats)[0] ?? null;
  }, [fixturesContext, pastFixtures]);

  const resolvedEventCategory =
    fixturesContext === "event"
      ? (lockedEventFixtureCategory?.trim() || inferredEventCategory || null)
      : null;

  const categoryFilterActive =
    fixturesContext === "event"
      ? resolvedEventCategory
      : selectedCategory;

  const filteredFixtures = useMemo(() => {
    let list = pastFixtures;
    if (categoryFilterActive) {
      list = list.filter(
        (f) => (f.category ?? "principal") === categoryFilterActive,
      );
    }
    return list.slice(0, maxItems);
  }, [pastFixtures, categoryFilterActive, maxItems]);

  const cardCount = filteredFixtures.length;
  const useMarquee = cardCount > 3;
  const MARQUEE_COPIES = 3;
  const carouselItems = useMarquee
    ? Array.from({ length: MARQUEE_COPIES }, () => filteredFixtures).flat()
    : filteredFixtures;

  useEffect(() => {
    setCurrentIndex(0);
  }, [categoryFilterActive, cardCount]);

  const scrollCarouselToIndex = (idx: number) => {
    const el = carouselRef.current;
    if (!el) return;
    const card = el.querySelector(`[data-card-index="${idx}"]`) as HTMLElement;
    if (card) {
      const cardWidth = card.offsetWidth;
      const gap = 16;
      el.scrollTo({ left: idx * (cardWidth + gap), behavior: "smooth" });
    }
  };

  const scrollToIndex = (index: number) => {
    const i = Math.max(0, Math.min(index, cardCount - 1));
    setCurrentIndex(i);
    scrollCarouselToIndex(i);
  };

  const getScore = (f: FixtureItem) => {
    const manual = resultadosManuais[f.externalId];
    if (manual) return { home: manual.homeScore, away: manual.awayScore };
    if (typeof f.homeScore === "number" && typeof f.awayScore === "number") {
      return { home: f.homeScore, away: f.awayScore };
    }
    return null;
  };

  const cardClassName =
    `w-[340px] min-w-[340px] shrink-0 snap-start rounded-xl bg-zinc-900/60 p-4 transition sm:w-[400px] sm:min-w-[400px] ${fullWidth ? "" : "border border-white/10 hover:border-white/20"}`;

  const marqueeDurationSec = fixturesMarqueeDurationSeconds(
    block.config?.fixturesCarouselMarqueeSpeed as string | undefined,
  );

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getPublicImageUrl(bgImage)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-zinc-950" style={{ opacity: overlayOpacity }} />
        </div>
      )}
      <div className={`relative w-full ${fullWidth ? "" : "container mx-auto max-w-5xl px-4 sm:px-6 lg:px-8"}`}>
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
            <span>{lang === "pt" ? "Carregando resultados…" : "Loading results…"}</span>
          </div>
        ) : pastFixtures.length === 0 ? (
          <div className={`rounded-2xl bg-white/5 px-6 py-12 text-center text-zinc-400 backdrop-blur-sm ${fullWidth ? "" : "border border-white/10"}`}>
            <Trophy className="mx-auto mb-3 h-12 w-12 opacity-50" />
            <p>
              {fixtures.length > 0
                ? (lang === "pt" ? "Nenhum resultado recente." : "No recent results.")
                : (lang === "pt" ? "Nenhum jogo cadastrado." : "No fixtures at the moment.")}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500">{lang === "pt" ? "Categoria:" : "Category:"}</span>
                {fixturesContext === "event" ? (
                  <span className="inline-flex min-h-9 items-center rounded-md border border-white/20 bg-white/5 px-3 text-sm font-medium text-white backdrop-blur-sm">
                    {resolvedEventCategory
                      ? getCategoryLabel(resolvedEventCategory, lang)
                      : (lang === "pt" ? "Todas" : "All")}
                  </span>
                ) : (
                  <Select
                    value={selectedCategory ?? "all"}
                    onValueChange={(v) => setSelectedCategory(v === "all" ? null : v)}
                  >
                    <SelectTrigger className="h-9 w-[140px] border-white/20 bg-white/5 text-white backdrop-blur-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{lang === "pt" ? "Todas" : "All"}</SelectItem>
                      {categoriesForFilter.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {getCategoryLabel(cat, lang)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <div
              className={`relative mt-6 ${useMarquee ? "overflow-hidden" : ""}`}
              onMouseEnter={() => setCarouselHover(true)}
              onMouseLeave={() => setCarouselHover(false)}
              title={useMarquee ? (lang === "pt" ? "Passar o mouse pausa o carrossel" : "Hover to pause carousel") : undefined}
            >
              {!useMarquee && cardCount > 1 && (
                <>
                  <button
                    type="button"
                    aria-label={lang === "pt" ? "Jogo anterior" : "Previous"}
                    onClick={() => scrollToIndex(currentIndex - 1)}
                    className="absolute left-2 sm:left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white shadow-lg backdrop-blur hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label={lang === "pt" ? "Próximo jogo" : "Next"}
                    onClick={() => scrollToIndex(currentIndex + 1)}
                    className="absolute right-2 sm:right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white shadow-lg backdrop-blur hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
              <div
                ref={carouselRef}
                className={`flex gap-4 py-2 ${useMarquee ? "" : "overflow-x-auto overflow-y-hidden pb-2 pl-12 pr-12 sm:pl-14 sm:pr-14 scroll-smooth scrollbar-thin"}`}
                style={{
                  ...(useMarquee ? { width: "max-content", animation: `proximos-jogos-marquee ${marqueeDurationSec}s linear infinite`, animationPlayState: carouselHover ? "paused" : "running" } : { scrollSnapType: "x mandatory", scrollbarWidth: "thin" }),
                }}
                onScroll={useMarquee ? undefined : () => {
                  const el = carouselRef.current;
                  if (!el || cardCount === 0) return;
                  const scrollLeft = el.scrollLeft;
                  const cardWidth = (el.querySelector("[data-card-index]") as HTMLElement)?.offsetWidth ?? 340;
                  const gap = 16;
                  const index = Math.round(scrollLeft / (cardWidth + gap));
                  setCurrentIndex(Math.max(0, Math.min(index, cardCount - 1)));
                }}
              >
                {carouselItems.map((f, index) => {
                  const score = getScore(f);
                  const competitionLine =
                    (f.competitionName && String(f.competitionName).trim()) ||
                    (competitionDisplayFallback && String(competitionDisplayFallback).trim()) ||
                    "";
                  const weWon =
                    score && isOurTeam(f.homeTeamName, displayOurTeamName)
                      ? score.home > score.away
                      : score && isOurTeam(f.awayTeamName, displayOurTeamName)
                        ? score.away > score.home
                        : null;
                  return (
                    <div
                      key={useMarquee ? `${f.externalId}-${index}` : f.externalId}
                      data-card-index={useMarquee ? undefined : index}
                      className={`${cardClassName} relative`}
                      style={{ scrollSnapAlign: "start" }}
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="shrink-0 text-xs font-medium uppercase tracking-wider text-amber-400/90">
                          {getCategoryLabel(f.category ?? "principal", lang)}
                        </span>
                        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                          {competitionLine ? (
                            <span className="truncate text-xs text-zinc-500">{competitionLine}</span>
                          ) : null}
                          {eventCardLogoSrc ? (
                            <div
                              className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-800/80"
                              title={competitionDisplayFallback ?? competitionLine ?? ""}
                            >
                              {isSvgUrl(eventCardLogoRaw) ? (
                                // eslint-disable-next-line @next/next/no-img-element -- SVG externo
                                <img
                                  src={eventCardLogoSrc}
                                  alt=""
                                  width={36}
                                  height={36}
                                  className="max-h-full max-w-full object-contain"
                                />
                              ) : (
                                <SmartImage
                                  src={eventCardLogoSrc}
                                  alt=""
                                  width={36}
                                  height={36}
                                  className="max-h-full max-w-full object-contain"
                                />
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="mb-2 flex items-center gap-1.5 text-xs text-zinc-500">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        {formatDate(f.startISO, lang)}
                      </div>
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <FixtureTeamLogo
                            teamName={f.homeTeamName}
                            ourTeamName={displayOurTeamName}
                            ourTeamLogoUrl={displayOurTeamLogoUrl}
                            logoUrlOverride={f.homeTeamLogoUrl}
                            size={40}
                          />
                          <span className="min-w-0 flex-1 overflow-hidden text-ellipsis text-sm font-semibold text-white whitespace-nowrap" title={isOurTeam(f.homeTeamName, displayOurTeamName) && displayOurTeamName ? displayOurTeamName : f.homeTeamName}>
                            {isOurTeam(f.homeTeamName, displayOurTeamName) && displayOurTeamName ? displayOurTeamName : f.homeTeamName}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center justify-center rounded-lg bg-white/10 px-3 py-1.5 min-w-[56px]">
                          {score ? (
                            <span className="text-base font-bold tabular-nums text-white">
                              {score.home} <span className="text-zinc-500">–</span> {score.away}
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-500">–</span>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 items-center gap-2 justify-end">
                          <FixtureTeamLogo
                            teamName={f.awayTeamName}
                            ourTeamName={displayOurTeamName}
                            ourTeamLogoUrl={displayOurTeamLogoUrl}
                            logoUrlOverride={f.awayTeamLogoUrl}
                            size={40}
                          />
                          <span className="min-w-0 flex-1 overflow-hidden text-ellipsis text-right text-sm font-semibold text-white whitespace-nowrap" title={isOurTeam(f.awayTeamName, displayOurTeamName) && displayOurTeamName ? displayOurTeamName : f.awayTeamName}>
                            {isOurTeam(f.awayTeamName, displayOurTeamName) && displayOurTeamName ? displayOurTeamName : f.awayTeamName}
                          </span>
                        </div>
                      </div>
                      {weWon !== null && (
                        <div
                          className={`mb-3 rounded-lg px-2 py-1 text-center text-xs font-medium ${
                            weWon ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                          }`}
                        >
                          {weWon ? (lang === "pt" ? "Vitória" : "Win") : (lang === "pt" ? "Derrota" : "Loss")}
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full border-white/20 text-white hover:bg-white/10"
                        onClick={() => setDetailsFixture(f)}
                      >
                        <Info className="mr-1.5 h-4 w-4" />
                        {lang === "pt" ? "Detalhes do jogo" : "Match details"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
      {detailsFixture && (
        <FixtureDetailsModal
          fixture={detailsFixture}
          score={getScore(detailsFixture)}
          weWon={
            (() => {
              const s = getScore(detailsFixture);
              if (!s) return null;
              return isOurTeam(detailsFixture.homeTeamName, displayOurTeamName)
                ? s.home > s.away
                : isOurTeam(detailsFixture.awayTeamName, displayOurTeamName)
                  ? s.away > s.home
                  : null;
            })()
          }
          goals={((block.config?.resultadosDetalhes as Record<string, { goals?: GoalDetail[] }>) ?? {})[detailsFixture.externalId]?.goals ?? []}
          redCards={((block.config?.resultadosDetalhes as Record<string, { redCards?: CardDetail[] }>) ?? {})[detailsFixture.externalId]?.redCards ?? []}
          yellowCards={((block.config?.resultadosDetalhes as Record<string, { yellowCards?: CardDetail[] }>) ?? {})[detailsFixture.externalId]?.yellowCards ?? []}
          substitutions={((block.config?.resultadosDetalhes as Record<string, { substitutions?: SubstitutionDetail[] }>) ?? {})[detailsFixture.externalId]?.substitutions ?? []}
          penalties={((block.config?.resultadosDetalhes as Record<string, { penalties?: PenaltyDetail[] }>) ?? {})[detailsFixture.externalId]?.penalties ?? []}
          formations={((block.config?.resultadosDetalhes as Record<string, { formations?: { home?: string; away?: string } }>) ?? {})[detailsFixture.externalId]?.formations}
          stats={((block.config?.resultadosDetalhes as Record<string, { stats?: MatchStats }>) ?? {})[detailsFixture.externalId]?.stats}
          videoUrls={((block.config?.resultadosDetalhes as Record<string, { videoUrls?: string[] }>) ?? {})[detailsFixture.externalId]?.videoUrls ?? []}
          ourTeamName={displayOurTeamName}
          ourTeamLogoUrl={displayOurTeamLogoUrl}
          lang={lang}
          competitionDisplayFallback={competitionDisplayFallback}
          onClose={() => setDetailsFixture(null)}
        />
      )}
    </section>
  );
}
