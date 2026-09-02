"use client";

import Link from "next/link";
import { MapPin, Shield, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PLAYER_STATUS_LABEL,
  SPORTS_SITUATION_LABEL,
} from "@/lib/futebol-executive-access";
import type {
  ExecutiveAgendaItem,
  ExecutiveLogisticsSummary,
  ExecutivePerformanceSummary,
  ExecutiveSquadSummary,
} from "@/lib/futebol-executive-types";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { formatDateDayMonYear } from "@/lib/format-date";
import { ExecutiveRing } from "./ExecutiveRing";

const STATUS_COLORS: Record<string, string> = {
  available: "bg-emerald-500",
  on_bench: "bg-emerald-400/70",
  injured: "bg-red-500",
  suspended: "bg-amber-500",
  absent: "bg-orange-500",
  not_in_squad: "bg-zinc-500",
};

export function ExecutiveSportPanel({
  squad,
  performance,
  logistics,
  agenda,
}: {
  squad: ExecutiveSquadSummary | null;
  performance: ExecutivePerformanceSummary | null;
  logistics: ExecutiveLogisticsSummary | null;
  agenda: ExecutiveAgendaItem[];
}) {
  if (!squad) {
    return (
      <section className="rounded-lg border border-border/70 bg-zinc-950/80 p-4">
        <p className="text-sm text-muted-foreground">Elenco indisponível no escopo atual.</p>
      </section>
    );
  }

  const disponivel = (squad.byStatus.available ?? 0) + (squad.byStatus.on_bench ?? 0);
  const statusEntries = Object.entries(squad.byStatus).filter(([, v]) => v > 0);

  const categoryEntries = Object.entries(squad.byCategory)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxCat = categoryEntries[0]?.[1] ?? 1;

  const situationEntries = Object.entries(squad.bySituation).filter(([, v]) => v > 0);

  const nextTrip = logistics?.items[0];
  const nextMatch = agenda.find((a) => a.type.includes("jogo") || a.title.toLowerCase().includes("jogo"));

  return (
    <section className="rounded-lg border border-border/70 bg-zinc-950/80">
      <header className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground">
            Situação esportiva
          </h2>
        </div>
        <Link
          href="/dashboard/cadastros/jogadores"
          className="text-[11px] text-primary hover:underline"
        >
          Ver elenco
        </Link>
      </header>

      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_140px]">
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[10px] font-medium uppercase text-muted-foreground">
              Por categoria
            </p>
            <div className="space-y-1.5">
              {categoryEntries.map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 truncate text-[11px] text-muted-foreground">
                    {getCategoryLabel(cat, "pt")}
                  </span>
                  <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-primary/80"
                      style={{ width: `${Math.round((count / maxCat) * 100)}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-[11px] tabular-nums font-medium">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {situationEntries.length > 0 ? (
            <div>
              <p className="mb-2 text-[10px] font-medium uppercase text-muted-foreground">
                Situação cadastral
              </p>
              <div className="flex flex-wrap gap-1.5">
                {situationEntries.map(([sit, count]) => (
                  <span
                    key={sit}
                    className="inline-flex items-center gap-1 rounded border border-border/60 bg-zinc-900/80 px-2 py-0.5 text-[11px]"
                  >
                    <span className="text-muted-foreground">
                      {SPORTS_SITUATION_LABEL[sit] ?? sit}
                    </span>
                    <span className="font-semibold tabular-nums">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded border border-border/50 bg-zinc-900/50 px-2.5 py-1.5">
              <Shield className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[11px] text-muted-foreground">Suspensos</span>
              <span className="text-sm font-bold tabular-nums">{squad.suspended}</span>
            </div>
            <div className="flex items-center gap-2 rounded border border-border/50 bg-zinc-900/50 px-2.5 py-1.5">
              <span className="text-[11px] text-muted-foreground">Próx. suspensão</span>
              <span className="text-sm font-bold tabular-nums">{squad.nearSuspension}</span>
            </div>
            {performance ? (
              <div className="flex items-center gap-2 rounded border border-border/50 bg-zinc-900/50 px-2.5 py-1.5">
                <span className="text-[11px] text-muted-foreground">Aptos BID</span>
                <span className="text-sm font-bold tabular-nums text-emerald-400">
                  {performance.available}
                </span>
                <span className="text-[11px] text-muted-foreground">/ {performance.available + performance.unavailable}</span>
              </div>
            ) : null}
          </div>

          {(nextTrip || nextMatch) && (
            <div className="rounded border border-border/50 bg-zinc-900/40 p-2.5">
              <p className="mb-1.5 text-[10px] font-medium uppercase text-muted-foreground">
                Próximo compromisso
              </p>
              {nextTrip ? (
                <Link
                  href={nextTrip.actionUrl}
                  className="flex items-start gap-2 hover:text-primary"
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{nextTrip.title}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{nextTrip.subtitle}</p>
                  </div>
                </Link>
              ) : nextMatch ? (
                <Link
                  href={nextMatch.actionUrl ?? "/dashboard/futebol/agenda"}
                  className="text-xs font-medium hover:text-primary"
                >
                  {nextMatch.title} · {formatDateDayMonYear(nextMatch.startAt.slice(0, 10))}
                </Link>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center rounded border border-border/50 bg-zinc-900/30 p-3">
          <ExecutiveRing
            value={disponivel}
            total={squad.total}
            size={72}
            stroke={6}
            fillClassName={
              disponivel / squad.total >= 0.7 ? "text-emerald-500" : "text-amber-500"
            }
          />
          <p className="mt-2 text-center text-[10px] text-muted-foreground">Disponibilidade</p>
          <p className="text-lg font-bold tabular-nums">
            {squad.total > 0 ? Math.round((disponivel / squad.total) * 100) : 0}%
          </p>
          <div className="mt-2 w-full space-y-1">
            {statusEntries.map(([st, count]) => (
              <div key={st} className="flex items-center gap-1.5">
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", STATUS_COLORS[st] ?? "bg-zinc-500")} />
                <span className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">
                  {PLAYER_STATUS_LABEL[st] ?? st}
                </span>
                <span className="text-[10px] tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
