"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  ContactRound,
  Loader2,
  Sparkles,
} from "lucide-react";
import { BchEmptyState } from "@/components/dashboard/boston-city-hall/BchEmptyState";
import { BchKpiCard } from "@/components/dashboard/boston-city-hall/BchKpiCard";
import { BchSection } from "@/components/dashboard/boston-city-hall/BchSection";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import type { BchOperationalAlert, VenueOverview } from "@/types/boston-city-hall";
import {
  BOOKING_STATUS_COLOR,
  BOOKING_STATUS_LABEL,
  formatTicketingMoney,
  PIPELINE_STAGE_CHART_COLOR,
  PIPELINE_STAGE_LABEL,
  PIPELINE_STAGES,
} from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";

const BCH_FINANCE_CURRENCY = "USD";

function formatBookingWhen(startIso: string, endIso: string): { date: string; time: string } {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const date = start.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  const time = `${start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  return { date, time };
}

function formatRelativeUpdated(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 7) return `${days} dias`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function welcomeName(displayName: string | null | undefined, username: string | null | undefined): string {
  const fromName = displayName?.trim();
  if (fromName) return fromName.split(/\s+/)[0] ?? fromName;
  return username?.trim() || "equipe";
}

type Props = {
  overview: VenueOverview;
};

export function BostonCityHallOperationalDashboard({ overview }: Props) {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<BchOperationalAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setAlertsLoading(true);
    api
      .get<BchOperationalAlert[]>(
        "/boston-city-hall/alerts?status=open&evaluate=1",
      )
      .then((res) => {
        if (!cancelled) setAlerts(Array.isArray(res.data) ? res.data.slice(0, 6) : []);
      })
      .catch(() => {
        if (!cancelled) setAlerts([]);
      })
      .finally(() => {
        if (!cancelled) setAlertsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const conversionPct =
    overview.leadsTotal > 0 ? Math.round((overview.leadsWon / overview.leadsTotal) * 100) : 0;

  const upcoming = overview.upcomingBookings ?? [];
  const operations = overview.operationsUpcoming ?? [];
  const attention = overview.leadsNeedingAttention ?? [];

  const combinedEvents = useMemo(() => {
    const fromOps = operations.map((ev) => ({
      key: `op-${ev.bookingId}`,
      href: `${BCH_BASE}/operacao/${ev.bookingId}`,
      title: ev.contactName?.trim() || ev.title,
      subtitle: `${formatBookingWhen(ev.startAt, ev.endAt).date} · ${ev.spaceName}`,
      status: ev.bookingStatus,
    }));
    const fromBookings = upcoming.slice(0, 6).map((b) => ({
      key: `bk-${b.id}`,
      href: `${BCH_BASE}/reservas?edit=${encodeURIComponent(b.id)}`,
      title: b.contactName?.trim() || b.title,
      subtitle: `${formatBookingWhen(b.startAt, b.endAt).date}${b.spaceName ? ` · ${b.spaceName}` : ""}`,
      status: b.status,
    }));
    return [...fromOps, ...fromBookings].slice(0, 8);
  }, [operations, upcoming]);

  const pipelineStages = useMemo(
    () =>
      PIPELINE_STAGES.map((stage) => ({
        stage,
        label: PIPELINE_STAGE_LABEL[stage] ?? stage,
        count: overview.pipelineByStage?.[stage] ?? 0,
        color: PIPELINE_STAGE_CHART_COLOR[stage] ?? "#94a3b8",
      })),
    [overview.pipelineByStage],
  );

  const pipelineMax = Math.max(1, ...pipelineStages.map((s) => s.count));

  const finance = overview.finance;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-500/20 bg-gradient-to-r from-[#0a0f1a] via-[#101a2e] to-[#0a0f1a] px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-amber-500/90">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Boston City Hall
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-50 sm:text-xl">
              Olá, {welcomeName(user?.name, user?.username)} — painel operacional
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {overview.bookingsToday ?? 0} reserva(s) hoje · {overview.leadsOpen} lead(s) em aberto ·{" "}
              {overview.spacesCount} espaço(s) ativos
            </p>
          </div>
          <Link
            href={`${BCH_BASE}/agenda`}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 text-sm font-medium text-amber-100 hover:bg-amber-500/15"
          >
            <CalendarDays className="h-4 w-4" aria-hidden />
            Agenda
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <BchKpiCard
          label="Reservas hoje"
          value={overview.bookingsToday ?? 0}
          icon={CalendarDays}
          tone="gold"
        />
        <BchKpiCard
          label="Próximas reservas"
          value={overview.upcomingBookingsTotal ?? 0}
          hint="Confirmadas à frente"
          icon={ClipboardList}
          tone="info"
        />
        <BchKpiCard
          label="Leads em aberto"
          value={overview.leadsOpen}
          hint={`${conversionPct}% conversão (${overview.leadsWon}/${overview.leadsTotal})`}
          icon={ContactRound}
          tone="warning"
        />
        <BchKpiCard
          label="Novos leads no mês"
          value={overview.leadsNewThisMonth ?? 0}
          hint={`${overview.bookingsThisMonth} reservas no mês`}
          tone="default"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BchSection title="Próximos eventos e reservas" actionHref={`${BCH_BASE}/reservas`} actionLabel="Ver reservas">
          {combinedEvents.length === 0 ? (
            <BchEmptyState icon={CalendarDays} message="Nenhum evento ou reserva próxima." />
          ) : (
            <ul className="space-y-2">
              {combinedEvents.map((row) => (
                <li key={row.key}>
                  <Link
                    href={row.href}
                    className="flex flex-col gap-1 rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-2.5 transition-colors hover:border-amber-500/20 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-100">{row.title}</p>
                      <p className="truncate text-xs text-slate-500">{row.subtitle}</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 self-start rounded-md border px-2 py-0.5 text-xs font-medium sm:self-center",
                        BOOKING_STATUS_COLOR[row.status] ?? "bg-muted text-muted-foreground",
                      )}
                    >
                      {BOOKING_STATUS_LABEL[row.status] ?? row.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </BchSection>

        <BchSection title="Alertas que exigem ação" actionHref={`${BCH_BASE}/alerts`} actionLabel="Central de alertas">
          {alertsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : alerts.length === 0 ? (
            <BchEmptyState icon={AlertTriangle} message="Nenhum alerta operacional aberto." />
          ) : (
            <ul className="space-y-2">
              {alerts.map((a) => (
                <li key={a.id}>
                  <Link
                    href={a.actionUrl ?? `${BCH_BASE}/alerts`}
                    className="block rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-2.5 hover:border-amber-500/20"
                  >
                    <p className="text-sm font-medium text-slate-100">{a.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{a.message}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </BchSection>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BchSection title="Funil comercial" actionHref={`${BCH_BASE}/pipeline`} actionLabel="Abrir funil">
          {pipelineStages.every((s) => s.count === 0) ? (
            <BchEmptyState message="Sem leads no funil." />
          ) : (
            <div className="space-y-2">
              {pipelineStages.map(({ stage, label, count, color }) => (
                <div key={stage} className="flex items-center gap-3">
                  <span className="w-[7rem] shrink-0 truncate text-xs text-slate-500 sm:w-32">{label}</span>
                  <div className="relative h-6 min-w-0 flex-1 overflow-hidden rounded-md bg-slate-900/80">
                    <div
                      className="absolute inset-y-0 left-0 rounded-md transition-all"
                      style={{
                        width: `${Math.max(count > 0 ? 8 : 0, (count / pipelineMax) * 100)}%`,
                        backgroundColor: color,
                        opacity: count > 0 ? 0.85 : 0,
                      }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-200">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
          {attention.length > 0 ? (
            <div className="mt-4 border-t border-slate-800/80 pt-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Leads prioritários</p>
              <ul className="space-y-1.5">
                {attention.slice(0, 4).map((lead) => (
                  <li key={lead.id}>
                    <Link
                      href={`${BCH_BASE}/crm`}
                      className="flex items-center justify-between gap-2 text-sm text-slate-300 hover:text-amber-200"
                    >
                      <span className="truncate">{lead.contactName}</span>
                      <span className="shrink-0 text-xs text-slate-500">
                        {formatRelativeUpdated(lead.updatedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </BchSection>

        <BchSection title="Resumo financeiro" actionHref={`${BCH_BASE}/financeiro`} actionLabel="Financeiro">
          {!finance ? (
            <BchEmptyState message="Sem dados financeiros agregados." />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <FinanceLine label="Contratado" value={finance.totalContracted} />
              <FinanceLine label="Recebido" value={finance.totalReceived} />
              <FinanceLine label="Em aberto" value={finance.openBalance} emphasize />
              <FinanceLine label="Vencido" value={finance.overdueBalance} danger={Number.parseFloat(finance.overdueBalance) > 0} />
              <FinanceLine label="Vence em 14 dias" value={finance.dueSoonBalance} className="sm:col-span-2" />
              <p className="sm:col-span-2 text-[11px] text-slate-600">
                Valores em {BCH_FINANCE_CURRENCY} (recebíveis do venue).
              </p>
            </div>
          )}
        </BchSection>
      </div>
    </div>
  );
}

function FinanceLine({
  label,
  value,
  emphasize,
  danger,
  className,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  danger?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-slate-800/70 bg-slate-950/50 px-3 py-2",
        emphasize && "border-amber-500/25",
        danger && "border-red-500/30",
        className,
      )}
    >
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={cn(
          "text-sm font-semibold tabular-nums text-slate-100",
          danger && "text-red-300",
        )}
      >
        {formatTicketingMoney(value, BCH_FINANCE_CURRENCY)}
      </p>
    </div>
  );
}
