"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Calendar, MapPin, Tv, Ticket, Home, Plane, Building2 } from "lucide-react";
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
  const url = `/api/public/tenants/${encodeURIComponent(slug)}/fixtures`;
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

const EXTERNAL_LOGO_EXTENSIONS = [".png", ".webp", ".svg"] as const;

/** Tamanho fixo de todos os logos nos cards (casa e visitante) para ficarem uniformes. */
const FIXTURE_LOGO_SIZE = 40;

function TeamLogo({
  teamName,
  ourTeamName,
  ourTeamLogoUrl,
  logoUrlOverride,
}: {
  teamName: string;
  ourTeamName: string | null | undefined;
  ourTeamLogoUrl: string | null | undefined;
  logoUrlOverride?: string | null;
}) {
  const size = FIXTURE_LOGO_SIZE;
  const [externalExtIndex, setExternalExtIndex] = useState(0);
  const [showPlaceholder, setShowPlaceholder] = useState(false);

  const logoBoxClass = "relative shrink-0 overflow-hidden rounded-lg bg-zinc-800 flex items-center justify-center";
  const logoBoxStyle = { width: size, height: size, minWidth: size, minHeight: size };

  if (logoUrlOverride?.trim()) {
    const src = getPublicImageUrl(logoUrlOverride);
    if (src) {
      return (
        <div className={logoBoxClass} style={logoBoxStyle}>
          <Image
            src={src}
            alt=""
            width={size}
            height={size}
            className="object-contain max-h-full max-w-full"
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
    if (src) {
      return (
        <div className={logoBoxClass} style={logoBoxStyle}>
          <Image
            src={src}
            alt=""
            width={size}
            height={size}
            className="object-contain max-h-full max-w-full"
            unoptimized={isProxyImageUrl(src)}
          />
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

  return (
    <div className={logoBoxClass} style={logoBoxStyle}>
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
  const [carouselHover, setCarouselHover] = useState(false);
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

  useEffect(() => {
    if (!slug?.trim()) return;
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
  }, [slug]);

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

  const cardCount = filteredFixtures.length;
  /** Marquee contínuo como o carrossel de logos: 3 cópias para loop fluido sem parar. */
  const MARQUEE_COPIES = 3;
  const carouselItems = cardCount > 1
    ? Array.from({ length: MARQUEE_COPIES }, () => filteredFixtures).flat()
    : filteredFixtures;

  const isHome = (f: FixtureItem) =>
    f.isOurTeamHome !== undefined ? f.isOurTeamHome : isOurTeam(f.homeTeamName, displayOurTeamName);
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
      <div className={`relative w-full ${fullWidth ? "" : "container mx-auto max-w-5xl px-0 sm:px-6 lg:px-8"}`}>
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
          <div className="mb-6 flex flex-wrap items-center justify-center gap-4">
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
            </div>
          </div>
        )}
      </div>

      {/* Marquee quando 2+ cards; um único card exibe sem animação para não cortar */}
      {!loading && upcomingFixtures.length > 0 && (
        <div
          className={`mt-6 w-full ${cardCount > 1 ? "overflow-hidden" : ""}`}
          onMouseEnter={() => setCarouselHover(true)}
          onMouseLeave={() => setCarouselHover(false)}
          title={cardCount > 1 ? (lang === "pt" ? "Passar o mouse pausa o carrossel" : "Hover to pause carousel") : undefined}
        >
          <div
            className="flex gap-4 py-2"
            style={{
              width: "max-content",
              ...(cardCount > 1
                ? {
                    animation: "proximos-jogos-marquee 50s linear infinite",
                    animationPlayState: carouselHover ? "paused" : "running",
                  }
                : {}),
            }}
          >
                {carouselItems.map((f, index) => (
                  <div
                    key={`${f.externalId}-${index}`}
                    className={`${cardClassName} relative`}
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
                    {/* Times — uma linha só; nomes em text-xs e truncados para não quebrar */}
                    <div className="mb-4 flex flex-nowrap items-center gap-1.5 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0 shrink">
                        <TeamLogo
                          teamName={f.homeTeamName}
                          ourTeamName={displayOurTeamName}
                          ourTeamLogoUrl={displayOurTeamLogoUrl}
                          logoUrlOverride={f.homeTeamLogoUrl}
                        />
                        <span className="font-semibold text-white text-xs truncate">
                          {isOurTeam(f.homeTeamName, displayOurTeamName) && displayOurTeamName ? displayOurTeamName : f.homeTeamName}
                        </span>
                      </div>
                      <span className="text-zinc-500 shrink-0 text-xs">×</span>
                      <div className="flex items-center gap-1.5 min-w-0 shrink">
                        <TeamLogo
                          teamName={f.awayTeamName}
                          ourTeamName={displayOurTeamName}
                          ourTeamLogoUrl={displayOurTeamLogoUrl}
                          logoUrlOverride={f.awayTeamLogoUrl}
                        />
                        <span className="font-semibold text-white text-xs truncate">
                          {isOurTeam(f.awayTeamName, displayOurTeamName) && displayOurTeamName ? displayOurTeamName : f.awayTeamName}
                        </span>
                      </div>
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
    </section>
  );
}
