"use client";

import Link from "next/link";
import type { ExecutiveNegotiationsSummary } from "@/lib/futebol-executive-types";
import {
  NEGOTIATION_STATUS_LABELS,
  NEGOTIATION_TYPE_LABELS,
  formatNegotiationMoney,
} from "@/lib/player-negotiation-labels";
import { ExecutiveCompactStat } from "./ExecutiveDecisionsAlertsColumn";

export function ExecutiveNegotiationsPanel({
  negotiations,
  periodDays,
}: {
  negotiations: ExecutiveNegotiationsSummary;
  periodDays: number;
}) {
  const typeRows = Object.entries(negotiations.byType).filter(([, v]) => v.count > 0);
  const statusRows = Object.entries(negotiations.byStatus).filter(([, v]) => v.count > 0);

  return (
    <section
      id="negociacoes"
      className="rounded-lg border border-border/70 bg-zinc-950/80"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide">
          Negociações comerciais
        </h2>
        <Link
          href="/dashboard/cadastros/jogadores/negociados"
          className="text-[10px] font-medium text-violet-400 hover:underline"
        >
          Gerenciar
        </Link>
      </header>

      <div className="grid gap-2 px-3 py-2 sm:grid-cols-2 xl:grid-cols-4">
        <ExecutiveCompactStat
          label="Em negociação"
          value={negotiations.inProgress}
          href="/dashboard/cadastros/jogadores/negociados"
        />
        <ExecutiveCompactStat label="Acordadas" value={negotiations.agreed} />
        <ExecutiveCompactStat label="Efetivadas" value={negotiations.effective} />
        <ExecutiveCompactStat
          label="Opções compra (prazo)"
          value={negotiations.purchaseOptionsApproaching}
          highlight={negotiations.purchaseOptionsApproaching > 0 ? "warning" : undefined}
        />
      </div>

      <div className="grid gap-3 border-t border-border/40 px-3 py-2 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">Valores</p>
          <ul className="space-y-0.5 text-xs">
            <li className="flex justify-between gap-2">
              <span className="text-muted-foreground">Total negociado</span>
              <span className="tabular-nums font-medium">
                {formatNegotiationMoney(negotiations.totalNegotiatedValue)}
              </span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-muted-foreground">No período ({periodDays}d)</span>
              <span className="tabular-nums font-medium">
                {formatNegotiationMoney(negotiations.periodNegotiatedValue)}
              </span>
            </li>
            {negotiations.averageNegotiatedPercentage != null ? (
              <li className="flex justify-between gap-2">
                <span className="text-muted-foreground">Média % negociada / retida</span>
                <span className="tabular-nums">
                  {negotiations.averageNegotiatedPercentage.toFixed(1)}% /{" "}
                  {negotiations.averageRetainedPercentage?.toFixed(1) ?? "—"}%
                </span>
              </li>
            ) : null}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">Parcelas</p>
          <ul className="space-y-0.5 text-xs">
            <li className="flex justify-between gap-2">
              <span className="text-muted-foreground">Recebido / pago</span>
              <span>{formatNegotiationMoney(negotiations.installments.paidAmount)}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-muted-foreground">Pendente</span>
              <span>{formatNegotiationMoney(negotiations.installments.pendingAmount)}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-muted-foreground">Vencido</span>
              <span className="text-amber-300">
                {formatNegotiationMoney(negotiations.installments.overdueAmount)} (
                {negotiations.installments.overdueCount})
              </span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-muted-foreground">Próx. vencimentos (30d)</span>
              <span>{negotiations.installments.upcomingDueCount}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="grid gap-3 border-t border-border/40 px-3 py-2 sm:grid-cols-3">
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">Por tipo</p>
          <ul className="max-h-[100px] space-y-0.5 overflow-y-auto text-[11px]">
            {typeRows.length === 0 ? (
              <li className="text-muted-foreground">—</li>
            ) : (
              typeRows.map(([k, v]) => (
                <li key={k} className="flex justify-between gap-1">
                  <span className="truncate">{NEGOTIATION_TYPE_LABELS[k] ?? k}</span>
                  <span className="shrink-0 tabular-nums">
                    {v.count} · {formatNegotiationMoney(v.value)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">Por status</p>
          <ul className="max-h-[100px] space-y-0.5 overflow-y-auto text-[11px]">
            {statusRows.map(([k, v]) => (
              <li key={k} className="flex justify-between gap-1">
                <span>{NEGOTIATION_STATUS_LABELS[k] ?? k}</span>
                <span className="tabular-nums">{v.count}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase text-muted-foreground">
            Por destino
          </p>
          <ul className="max-h-[100px] space-y-0.5 overflow-y-auto text-[11px]">
            {negotiations.topClubsByValue.length === 0 ? (
              <li className="text-muted-foreground">—</li>
            ) : (
              negotiations.topClubsByValue.map((c) => (
                <li key={c.name} className="flex justify-between gap-1">
                  <span className="truncate">{c.name}</span>
                  <span className="shrink-0 tabular-nums">{formatNegotiationMoney(c.value)}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
