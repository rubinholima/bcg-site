"use client";

import { Button } from "@/components/ui/button";
import { MapPin, Tv, Ticket, Home, Plane } from "lucide-react";
import type { FixtureItem } from "@/lib/fixtures-shared";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { BRAZIL_TZ, dateKeyInBrazil, timeInBrazil } from "@/lib/brazil-time";

function formatTime(iso: string, lang: "pt" | "en"): string {
  return timeInBrazil(iso);
}

function formatDayMonth(iso: string, lang: "pt" | "en"): { day: string; month: string; weekday: string } {
  const d = new Date(iso);
  return {
    day: new Intl.DateTimeFormat(lang === "pt" ? "pt-BR" : "en-GB", {
      timeZone: BRAZIL_TZ,
      day: "numeric",
    }).format(d),
    month: new Intl.DateTimeFormat(lang === "pt" ? "pt-BR" : "en-GB", {
      timeZone: BRAZIL_TZ,
      month: "short",
    })
      .format(d)
      .replace(/\./g, "")
      .toUpperCase(),
    weekday: new Intl.DateTimeFormat(lang === "pt" ? "pt-BR" : "en-GB", {
      timeZone: BRAZIL_TZ,
      weekday: "short",
    })
      .format(d)
      .replace(/\./g, "")
      .toUpperCase()
      .slice(0, 3),
  };
}

export function ProximosJogosVenuePills({
  lang,
  value,
  onChange,
  show,
}: {
  lang: "pt" | "en";
  value: "all" | "home" | "away";
  onChange: (v: "all" | "home" | "away") => void;
  show: boolean;
}) {
  if (!show) return null;
  const opts = [
    { id: "all" as const, label: lang === "pt" ? "Todos" : "All" },
    { id: "home" as const, label: lang === "pt" ? "Casa" : "Home", icon: Home },
    { id: "away" as const, label: lang === "pt" ? "Fora" : "Away", icon: Plane },
  ];
  return (
    <div
      className="mb-4 flex rounded-2xl border border-white/10 bg-zinc-900/70 p-1"
      role="tablist"
      aria-label={lang === "pt" ? "Filtrar local do jogo" : "Filter venue"}
    >
      {opts.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={value === id}
          onClick={() => onChange(id)}
          className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-medium transition ${
            value === id
              ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
          {label}
        </button>
      ))}
    </div>
  );
}

export function ProximosJogosMobileCarousel({
  fixtures,
  lang,
  resolveDisplayTeamName,
  isHome,
  homeAwayLabel,
  fixturesContext,
  competitionDisplayFallback,
  fullWidth,
}: {
  fixtures: FixtureItem[];
  lang: "pt" | "en";
  resolveDisplayTeamName: (name: string) => string;
  isHome: (f: FixtureItem) => boolean;
  homeAwayLabel: (f: FixtureItem) => string;
  fixturesContext: "tenant" | "event";
  competitionDisplayFallback?: string | null;
  fullWidth?: boolean;
}) {
  return (
    <div
      className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {fixtures.map((f, index) => {
        const { day, month, weekday } = formatDayMonth(f.startISO, lang);
        const home = resolveDisplayTeamName(f.homeTeamName);
        const away = resolveDisplayTeamName(f.awayTeamName);
        const competitionLabel =
          (f.competitionName && String(f.competitionName).trim()) ||
          (competitionDisplayFallback && String(competitionDisplayFallback).trim()) ||
          "";
        const isFirst = index === 0;

        return (
          <article
            key={`${f.externalId}-m-${index}`}
            className={`relative flex w-[min(88vw,340px)] shrink-0 snap-center flex-col overflow-hidden rounded-2xl ${
              fullWidth ? "bg-zinc-900/80" : "border border-white/10 bg-zinc-900/70"
            } ${isFirst ? "ring-1 ring-amber-500/40" : ""}`}
          >
            {isFirst && (
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
            )}
            <div className="flex min-h-0 flex-1">
              {/* Calendário lateral estilo ingresso */}
              <div className="flex w-[72px] shrink-0 flex-col items-center justify-center border-r border-dashed border-white/10 bg-zinc-950/50 py-4">
                <span className="text-[10px] font-semibold tracking-widest text-amber-400/90">{weekday}</span>
                <span className="text-3xl font-black leading-none text-white">{day}</span>
                <span className="text-[10px] font-medium uppercase text-zinc-500">{month}</span>
                <span className="mt-2 text-xs font-medium text-zinc-400">{formatTime(f.startISO, lang)}</span>
              </div>

              <div className="flex min-w-0 flex-1 flex-col p-3">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  {fixturesContext !== "event" && (
                    <span
                      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        isHome(f) ? "bg-emerald-500/20 text-emerald-300" : "bg-sky-500/20 text-sky-300"
                      }`}
                    >
                      {isHome(f) ? <Home className="h-2.5 w-2.5" /> : <Plane className="h-2.5 w-2.5" />}
                      {homeAwayLabel(f)}
                    </span>
                  )}
                  <span className="truncate text-[10px] text-zinc-500">
                    {getCategoryLabel(f.category ?? "principal", lang)}
                  </span>
                </div>

                <p className="mb-1 line-clamp-2 text-sm font-bold leading-snug text-white">
                  {home}
                </p>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                  {lang === "pt" ? "vs" : "vs"}
                </p>
                <p className="mb-2 line-clamp-2 text-sm font-bold leading-snug text-zinc-200">
                  {away}
                </p>

                {competitionLabel ? (
                  <p className="mb-2 truncate text-[10px] uppercase tracking-wide text-zinc-500">
                    {competitionLabel}
                  </p>
                ) : null}

                {f.venueName ? (
                  <p className="mt-auto flex items-start gap-1 text-[11px] leading-tight text-zinc-500">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                    <span className="line-clamp-2">{f.venueName}</span>
                  </p>
                ) : null}
              </div>
            </div>

            {(f.ticketUrl || f.watchUrl) && (
              <div className="flex border-t border-white/5">
                {f.ticketUrl && (
                  <a href={f.ticketUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-11 w-full rounded-none text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Ticket className="mr-1 h-3.5 w-3.5" />
                      {lang === "pt" ? "Ingresso" : "Tickets"}
                    </Button>
                  </a>
                )}
                {f.watchUrl && (
                  <a href={f.watchUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-11 w-full rounded-none border-l border-white/5 text-xs text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                    >
                      <Tv className="mr-1 h-3.5 w-3.5" />
                      {lang === "pt" ? "Assistir" : "Watch"}
                    </Button>
                  </a>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
