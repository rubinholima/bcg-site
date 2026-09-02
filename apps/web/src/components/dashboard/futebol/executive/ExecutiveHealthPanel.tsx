"use client";

import Link from "next/link";
import { Stethoscope } from "lucide-react";
import type { ExecutiveHealthSummary } from "@/lib/futebol-executive-types";
import { ExecutiveRing } from "./ExecutiveRing";
import { ExecutiveCompactStat } from "./ExecutiveDecisionsAlertsColumn";

export function ExecutiveHealthPanel({ health }: { health: ExecutiveHealthSummary }) {
  const operationalDenom = Math.max(health.unavailable + 1, health.activePhysio + health.unavailable, 1);

  return (
    <section className="rounded-lg border border-border/70 bg-zinc-950/80">
      <header className="flex items-center gap-1.5 border-b border-border/50 px-3 py-2">
        <Stethoscope className="h-3.5 w-3.5 text-primary" />
        <h2 className="text-[11px] font-semibold uppercase tracking-wide">Saúde</h2>
      </header>
      <div className="flex gap-3 p-3">
        <div className="flex shrink-0 flex-col items-center">
          <ExecutiveRing
            value={Math.max(0, operationalDenom - health.unavailable)}
            total={operationalDenom}
            size={52}
            stroke={4}
            fillClassName="text-emerald-500"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">Operacional</p>
        </div>
        <div className="min-w-0 flex-1 space-y-0">
          <ExecutiveCompactStat label="Indisponíveis" value={health.unavailable} highlight={health.unavailable > 0 ? "warning" : undefined} />
          <ExecutiveCompactStat label="Fisio ativo" value={health.activePhysio} href="/dashboard/saude/fisioterapia" />
          <ExecutiveCompactStat label="Transição" value={health.inTransition} />
          <ExecutiveCompactStat label="Saídas CT" value={health.medicalDeparturesOpen} />
          <ExecutiveCompactStat
            label="Retorno atrasado"
            value={health.medicalDeparturesOverdue}
            highlight={health.medicalDeparturesOverdue > 0 ? "danger" : undefined}
          />
          <ExecutiveCompactStat
            label="Try-out pend."
            value={health.tryoutClearancePending}
            highlight={health.tryoutClearancePending > 0 ? "warning" : undefined}
          />
          {health.tryoutClearanceRejected > 0 ? (
            <ExecutiveCompactStat
              label="Try-out reprov."
              value={health.tryoutClearanceRejected}
              highlight="danger"
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
