"use client";

import { TrendingUp } from "lucide-react";
import type { ExecutivePerformanceSummary } from "@/lib/futebol-executive-types";
import { ExecutiveRing } from "./ExecutiveRing";
import { ExecutiveCompactStat } from "./ExecutiveDecisionsAlertsColumn";

export function ExecutivePerformancePanel({
  performance,
}: {
  performance: ExecutivePerformanceSummary;
}) {
  const total = performance.available + performance.unavailable;
  const pct = total > 0 ? Math.round((performance.available / total) * 100) : 0;

  return (
    <section className="rounded-lg border border-border/70 bg-zinc-950/80">
      <header className="flex items-center gap-1.5 border-b border-border/50 px-3 py-2">
        <TrendingUp className="h-3.5 w-3.5 text-primary" />
        <h2 className="text-[11px] font-semibold uppercase tracking-wide">Performance</h2>
      </header>
      <div className="flex gap-3 p-3">
        <div className="flex shrink-0 flex-col items-center">
          <ExecutiveRing
            value={performance.available}
            total={Math.max(total, 1)}
            size={52}
            stroke={4}
            fillClassName={pct >= 70 ? "text-emerald-500" : "text-amber-500"}
          />
          <p className="mt-1 text-lg font-bold tabular-nums">{pct}%</p>
          <p className="text-[10px] text-muted-foreground">Aptos BID</p>
        </div>
        <div className="min-w-0 flex-1">
          <ExecutiveCompactStat label="Aptos" value={performance.available} />
          <ExecutiveCompactStat
            label="Não aptos"
            value={performance.unavailable}
            highlight={performance.unavailable > 0 ? "warning" : undefined}
          />
          <ExecutiveCompactStat
            label="Aval. treinador pend."
            value={performance.pendingCoachEvaluations}
            href="/dashboard/futebol/treinadores/avaliacao-jogador"
            highlight={performance.pendingCoachEvaluations > 0 ? "warning" : undefined}
          />
          <ExecutiveCompactStat label="Transições ativas" value={performance.activeTransitions} />
        </div>
      </div>
    </section>
  );
}
