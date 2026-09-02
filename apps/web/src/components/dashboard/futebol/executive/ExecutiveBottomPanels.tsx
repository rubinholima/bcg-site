"use client";

import Link from "next/link";
import {
  Calendar,
  ClipboardCheck,
  FileBarChart,
  FileText,
  Map,
  Shield,
  Target,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  ExecutiveAgendaItem,
  ExecutiveContractsSummary,
  ExecutiveFinanceSummary,
  ExecutiveLogisticsSummary,
  ExecutiveQuickAction,
} from "@/lib/futebol-executive-types";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { formatDateDayMonYear } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { ExecutiveCompactStat } from "./ExecutiveDecisionsAlertsColumn";
import { ExecutiveActionList } from "./ExecutiveActionList";

const ACTION_ICONS: Record<string, LucideIcon> = {
  "Relatórios dinâmicos": FileBarChart,
  "Cartões e suspensão": Shield,
  Captação: UserPlus,
  "Avaliação CT": Target,
  Logística: Map,
  Agenda: Calendar,
  Contratos: FileText,
  "Aprovações compras": ClipboardCheck,
  "Aprovações financeiro": ClipboardCheck,
  Elenco: UserPlus,
  Fisioterapia: Target,
  "Avaliação treinador": FileBarChart,
};

export function ExecutiveContractsPanel({
  contracts,
}: {
  contracts: ExecutiveContractsSummary;
}) {
  return (
    <section className="rounded-lg border border-border/70 bg-zinc-950/80">
      <header className="border-b border-border/50 px-3 py-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide">Contratos / RH</h2>
      </header>
      <div className="px-3 py-2">
        <ExecutiveCompactStat
          label="Vencendo (60d)"
          value={contracts.expiringSoon}
          href="/dashboard/juridico"
          highlight={contracts.expiringSoon > 0 ? "warning" : undefined}
        />
        <ExecutiveCompactStat
          label="Vencidos"
          value={contracts.expired}
          highlight={contracts.expired > 0 ? "danger" : undefined}
        />
        <ExecutiveCompactStat label="Assinatura pend." value={contracts.pendingSignature} />
        <ExecutiveCompactStat
          label="Cadastro RH"
          value={contracts.registrationPending}
          href="/dashboard/adm/rh"
        />
      </div>
    </section>
  );
}

export function ExecutiveLogisticsPanel({
  logistics,
}: {
  logistics: ExecutiveLogisticsSummary;
}) {
  return (
    <section className="rounded-lg border border-border/70 bg-zinc-950/80">
      <header className="flex items-center justify-between border-b border-border/50 px-3 py-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide">Logística</h2>
        {logistics.incompleteConvocation > 0 ? (
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">
            {logistics.incompleteConvocation} incompleto(s)
          </span>
        ) : null}
      </header>
      <div className="px-2 py-1">
        {logistics.items[0] ? (
          <Link
            href={logistics.items[0].actionUrl}
            className="mb-1 block rounded border border-primary/20 bg-primary/5 px-2.5 py-2 hover:bg-primary/10"
          >
            <p className="text-xs font-medium">{logistics.items[0].title}</p>
            <p className="text-[11px] text-muted-foreground">{logistics.items[0].subtitle}</p>
          </Link>
        ) : (
          <p className="py-2 text-center text-xs text-muted-foreground">Sem viagens no período</p>
        )}
        <ExecutiveActionList items={logistics.items.slice(1, 4)} emptyLabel="" />
      </div>
    </section>
  );
}

export function ExecutiveAgendaPanel({ agenda }: { agenda: ExecutiveAgendaItem[] }) {
  return (
    <section id="agenda" className="rounded-lg border border-border/70 bg-zinc-950/80">
      <header className="border-b border-border/50 px-3 py-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide">Agenda</h2>
      </header>
      {agenda.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">Sem compromissos no período</p>
      ) : (
        <ul className="max-h-[180px] divide-y divide-border/40 overflow-y-auto px-2">
          {agenda.slice(0, 8).map((item) => (
            <li key={item.id}>
              <Link
                href={item.actionUrl ?? "/dashboard/futebol/agenda"}
                className="flex items-center justify-between gap-2 py-1.5 text-xs hover:text-primary"
              >
                <span className="min-w-0 truncate font-medium">{item.title}</span>
                <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                  {formatDateDayMonYear(item.startAt.slice(0, 10))}
                  {item.category ? ` · ${getCategoryLabel(item.category, "pt")}` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ExecutiveFinancePanel({ finance }: { finance: ExecutiveFinanceSummary }) {
  return (
    <section className="rounded-lg border border-border/70 bg-zinc-950/80">
      <header className="border-b border-border/50 px-3 py-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide">Financeiro</h2>
      </header>
      <div className="grid gap-2 px-3 py-2 sm:grid-cols-2 xl:grid-cols-4">
        <ExecutiveCompactStat
          label="Compras — financeiro"
          value={finance.pendingFinanceiroApprovals}
          href="/dashboard/adm/financeiro/aprovacoes"
        />
        <ExecutiveCompactStat
          label="Compras — diretoria"
          value={finance.pendingDiretoriaApprovals}
          href="/dashboard/diretoria/aprovacoes-compras"
        />
        {finance.lancamentosPendentes != null ? (
          <ExecutiveCompactStat label="A pagar" value={finance.lancamentosPendentes} />
        ) : null}
        {finance.lancamentosVencidos != null ? (
          <ExecutiveCompactStat
            label="Vencidos"
            value={finance.lancamentosVencidos}
            highlight={finance.lancamentosVencidos > 0 ? "danger" : undefined}
          />
        ) : null}
      </div>
    </section>
  );
}


export function ExecutiveQuickActionsGrid({
  actions,
  compact = false,
}: {
  actions: ExecutiveQuickAction[];
  compact?: boolean;
}) {
  if (actions.length === 0) return null;

  return (
    <section className="rounded-lg border border-border/70 bg-zinc-950/80">
      <header className="border-b border-border/50 px-3 py-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide">Acesso rápido</h2>
      </header>
      <div
        className={cn(
          "grid gap-2 p-3",
          compact ? "grid-cols-2" : "grid-cols-3 sm:grid-cols-4 lg:grid-cols-8",
        )}
      >
        {actions.map((a) => {
          const Icon = ACTION_ICONS[a.label] ?? Target;
          return (
            <Link
              key={`${a.href}-${a.label}`}
              href={a.href}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-border/50 bg-zinc-900/50 px-2 py-2.5 text-center transition-colors hover:border-primary/35 hover:bg-zinc-900"
            >
              <Icon className="h-4 w-4 text-primary" />
              <span className="line-clamp-2 text-[10px] font-medium leading-tight">{a.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
