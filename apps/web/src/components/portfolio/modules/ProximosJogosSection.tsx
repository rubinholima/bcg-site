"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import type { HomeContentBlock } from "@/types/home-content";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPublicImageUrl, isProxyImageUrl } from "@/lib/media-url";
import { SectionTitle } from "@/components/portfolio/SectionTitle";
import { Calendar, MapPin, Tv, Ticket, Home, Plane, Building2, ChevronLeft, ChevronRight } from "lucide-react";
import { FIXTURE_CATEGORIES, getCategoryLabel } from "@/lib/fixture-categories";

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

async function fetchFixtures(slug: string): Promise<FixtureItem[]> {
  const url =
    typeof window !== "undefined"
      ? `/api/public/tenants/${encodeURIComponent(slug)}/fixtures`
      : `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/public/tenants/${encodeURIComponent(slug)}/fixtures`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
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

/** Data em destaque no card: "14 SAT" (dia + dia da semana abreviado). */
function formatBigDate(iso: string, lang: "pt" | "en"): string {
  const d = new Date(iso);
  const day = d.getDate();
  const weekday = d.toLocaleDateString(lang === "pt" ? "pt-BR" : "en-GB", {
    weekday: "short",
  })
    .replace(/\./g, "")
    .toUpperCase()
    .slice(0, 3);
  return `${day} ${weekday}`;
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

/** Compara se o nome do time é o nosso (página/tenant). */
function isOurTeam(teamName: string, ourTeamName: string | null | undefined): boolean {
  if (!ourTeamName?.trim()) return false;
  const a = teamName.trim().toLowerCase();
  const b = ourTeamName.trim().toLowerCase();
  if (a === b) return true;
  // match se um contém o outro (ex: "Boston City" vs "Boston City FC")
  return a.includes(b) || b.includes(a);
}

const EXTERNAL_LOGO_EXTENSIONS = [".png", ".webp", ".svg"] as const;

function TeamLogo({
  teamName,
  ourTeamName,
  ourTeamLogoUrl,
  logoUrlOverride,
  size = 40,
}: {
  teamName: string;
  ourTeamName: string | null | undefined;
  ourTeamLogoUrl: string | null | undefined;
  /** Se definido (ex.: manual no editor), usa este logo e ignora nossa base / pasta externa. */
  logoUrlOverride?: string | null;
  size?: number;
}) {
  const [externalExtIndex, setExternalExtIndex] = useState(0);
  const [showPlaceholder, setShowPlaceholder] = useState(false);

  if (logoUrlOverride?.trim()) {
    const src = getPublicImageUrl(logoUrlOverride);
    if (src) {
      return (
        <div
          className="relative shrink-0 overflow-hidden rounded-lg bg-zinc-800"
          style={{ width: size, height: size }}
        >
          <Image
            src={src}
            alt=""
            width={size}
            height={size}
            className="object-contain"
            unoptimized={isProxyImageUrl(src)}
          />
        </div>
      );
    }
  }

  const isOurs = isOurTeam(teamName, ourTeamName);
  const slug = slugFromTeamName(teamName);

  if (isOurs && ourTeamLogoUrl) {
    const src = getPublicImageUrl(ourTeamLogoUrl);
    if (!src) {
      return (
        <div
          className="flex shrink-0 items-center justify-center rounded-lg bg-zinc-700 text-zinc-400"
          style={{ width: size, height: size }}
        >
          <Building2 className="h-5 w-5" />
        </div>
      );
    }
    return (
      <div
        className="relative shrink-0 overflow-hidden rounded-lg bg-zinc-800"
        style={{ width: size, height: size }}
      >
        <Image
          src={src}
          alt=""
          width={size}
          height={size}
          className="object-contain"
          unoptimized={isProxyImageUrl(src)}
        />
      </div>
    );
  }

  // Time externo: /logos/teams-externos/{slug}.png | .webp | .svg
  const base = "/logos/teams-externos/" + slug;
  const externalSrc = base + EXTERNAL_LOGO_EXTENSIONS[externalExtIndex];

  if (showPlaceholder) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-lg bg-zinc-700 text-zinc-400"
        style={{ width: size, height: size }}
      >
        <Building2 className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-lg bg-zinc-800"
      style={{ width: size, height: size }}
    >
      <img
        src={externalSrc}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-contain"
        onError={() => {
          if (externalExtIndex < EXTERNAL_LOGO_EXTENSIONS.length - 1) {
            setExternalExtIndex((i) => i + 1);
          } else {
            setShowPlaceholder(true);
          }
        }}
      />
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
}: {
  block: HomeContentBlock;
  slug: string;
  lang: "pt" | "en";
  ourTeamName?: string | null;
  ourTeamLogoUrl?: string | null;
  fullWidth?: boolean;
  titleAlign?: "left" | "center" | "right";
}) {
  const [fixtures, setFixtures] = useState<FixtureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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
  const cardStyle = (block.config?.proximosJogosCardStyle as "box" | "flat") || "flat";
  const paddingTop = (block.config?.proximosJogosPaddingTop as "minimal" | "compact" | "normal" | "large") || "compact";
  const paddingBottom = (block.config?.proximosJogosPaddingBottom as "minimal" | "compact" | "normal" | "large") || "compact";

  const paddingTopClass =
    paddingTop === "minimal" ? "pt-4 sm:pt-5" : paddingTop === "compact" ? "pt-6 sm:pt-8" : paddingTop === "large" ? "pt-20 sm:pt-24" : "pt-12 sm:pt-16";
  const paddingBottomClass =
    paddingBottom === "minimal" ? "pb-4 sm:pb-5" : paddingBottom === "compact" ? "pb-6 sm:pb-8" : paddingBottom === "large" ? "pb-20 sm:pb-24" : "pb-12 sm:pb-16";

  useEffect(() => {
    let cancelled = false;
    fetchFixtures(slug).then((list) => {
      if (!cancelled) {
        setFixtures(list);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, []);
  const upcomingFixtures = useMemo(
    () => fixtures.filter((f) => new Date(f.startISO) > new Date()),
    [fixtures, tick],
  );

  const datesWithGames = useMemo(() => {
    const set = new Set<string>();
    upcomingFixtures.forEach((f) => set.add(dateKey(f.startISO)));
    return Array.from(set).sort();
  }, [upcomingFixtures]);

  /** Categorias para o filtro: sempre exibe todas, para o usuário poder filtrar (ex: Sub-15) mesmo sem jogos. */
  const categoriesForFilter = useMemo(
    () => FIXTURE_CATEGORIES.map((c) => c.value),
    [],
  );

  const filteredFixtures = useMemo(() => {
    let list = upcomingFixtures;
    if (selectedDate) {
      list = list.filter((f) => dateKey(f.startISO) === selectedDate);
    }
    if (selectedCategory) {
      list = list.filter((f) => (f.category ?? "principal") === selectedCategory);
    }
    return list;
  }, [upcomingFixtures, selectedDate, selectedCategory]);

  const carouselRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [carouselHover, setCarouselHover] = useState(false);
  const cardCount = filteredFixtures.length;

  useEffect(() => {
    setCurrentIndex(0);
  }, [selectedDate, selectedCategory, cardCount]);

  useEffect(() => {
    if (cardCount <= 1 || carouselHover) return;
    const t = setInterval(() => {
      setCurrentIndex((i) => {
        const next = i + 1 >= cardCount ? 0 : i + 1;
        scrollCarouselToIndex(next);
        return next;
      });
    }, 5000);
    return () => clearInterval(t);
  }, [cardCount, carouselHover]);

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

  const isHome = (f: FixtureItem) =>
    f.isOurTeamHome !== undefined ? f.isOurTeamHome : isOurTeam(f.homeTeamName, ourTeamName);
  const homeAwayLabel = (f: FixtureItem) =>
    isHome(f)
      ? (lang === "pt" ? "Casa" : "Home")
      : (lang === "pt" ? "Fora" : "Away");

  const cardClassName =
    `min-w-[280px] max-w-[320px] shrink-0 snap-start rounded-xl bg-zinc-900/60 p-4 transition sm:min-w-[300px] ${fullWidth ? "" : "border border-white/10 hover:border-white/20"}`;

  return (
    <section
      className={`relative overflow-hidden ${fullWidth ? "" : "border-b border-white/5"} ${paddingTopClass} ${paddingBottomClass}`}
      style={bgColor ? { backgroundColor: bgColor } : undefined}
    >
      {bgImage && (
        <div className="absolute inset-0">
          <Image
            src={getPublicImageUrl(bgImage)}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            unoptimized={isProxyImageUrl(getPublicImageUrl(bgImage))}
          />
          <div className="absolute inset-0 bg-zinc-950" style={{ opacity: overlayOpacity }} />
        </div>
      )}
      <div className={`relative w-full px-4 sm:px-6 lg:px-8 ${fullWidth ? "" : "container mx-auto max-w-5xl"}`}>
        {title && (
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
              {/* Filtros: data e categoria em dropdowns */}
              <div className="mb-6 flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500">
                  {lang === "pt" ? "Data:" : "Date:"}
                </span>
                <Select
                  value={selectedDate ?? "all"}
                  onValueChange={(v) => setSelectedDate(v === "all" ? null : v)}
                >
                  <SelectTrigger className="w-[140px] h-9 border-white/20 bg-zinc-900/60 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {lang === "pt" ? "Todas" : "All"}
                    </SelectItem>
                    {datesWithGames.map((d) => {
                      const [y, m, day] = d.split("-");
                      const dateObj = new Date(Number(y), Number(m) - 1, Number(day));
                      const label = dateObj.toLocaleDateString(lang === "pt" ? "pt-BR" : "en-GB", {
                        day: "numeric",
                        month: "short",
                      });
                      return (
                        <SelectItem key={d} value={d}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500">
                  {lang === "pt" ? "Categoria:" : "Category:"}
                </span>
                <Select
                  value={selectedCategory ?? "all"}
                  onValueChange={(v) => setSelectedCategory(v === "all" ? null : v)}
                >
                  <SelectTrigger className="w-[140px] h-9 border-white/20 bg-zinc-900/60 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {lang === "pt" ? "Todas" : "All"}
                    </SelectItem>
                    {categoriesForFilter.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {getCategoryLabel(cat, lang)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}

        {/* Carrossel */}
        {!loading && upcomingFixtures.length > 0 && (
          <div
            className="relative overflow-hidden mt-6"
            onMouseEnter={() => setCarouselHover(true)}
            onMouseLeave={() => setCarouselHover(false)}
          >
          {cardCount > 1 && (
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
            className="flex gap-4 overflow-x-auto overflow-y-hidden pb-2 pl-12 pr-12 sm:pl-14 sm:pr-14 scroll-smooth scrollbar-thin"
            style={{
              scrollSnapType: "x mandatory",
              scrollbarWidth: "thin",
            }}
            onScroll={() => {
              const el = carouselRef.current;
              if (!el || cardCount === 0) return;
              const scrollLeft = el.scrollLeft;
              const cardWidth = (el.querySelector("[data-card-index]") as HTMLElement)?.offsetWidth ?? 320;
              const gap = 16;
              const index = Math.round(scrollLeft / (cardWidth + gap));
              setCurrentIndex(Math.max(0, Math.min(index, cardCount - 1)));
            }}
          >
                {filteredFixtures.map((f, index) => (
                  <div
                    key={f.externalId}
                    data-card-index={index}
                    className={`${cardClassName} relative`}
                    style={{ scrollSnapAlign: "start" }}
                  >
                    {/* Topo: competição + categoria + data à esquerda, Casa/Fora à direita */}
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {f.competitionName && (
                            <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                              {f.competitionName}
                            </span>
                          )}
                          <span className="text-xs font-medium text-amber-400/90">
                            {getCategoryLabel(f.category ?? "principal", lang)}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-500">
                          {formatDate(f.startISO, lang)}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs ${
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
                    </div>
                    {/* Data em destaque */}
                    <div className="mb-3 text-2xl font-bold text-white">
                      {formatBigDate(f.startISO, lang)}
                    </div>
                    {/* Times */}
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      <TeamLogo
                        teamName={f.homeTeamName}
                        ourTeamName={ourTeamName}
                        ourTeamLogoUrl={ourTeamLogoUrl}
                        logoUrlOverride={f.homeTeamLogoUrl}
                        size={28}
                      />
                      <span className="font-semibold text-white text-sm">
                        {f.homeTeamName}
                      </span>
                      <span className="text-zinc-500">×</span>
                      <TeamLogo
                        teamName={f.awayTeamName}
                        ourTeamName={ourTeamName}
                        ourTeamLogoUrl={ourTeamLogoUrl}
                        logoUrlOverride={f.awayTeamLogoUrl}
                        size={28}
                      />
                      <span className="font-semibold text-white text-sm">
                        {f.awayTeamName}
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
                ))}
          </div>
        </div>
      )}
      </div>
    </section>
  );
}
