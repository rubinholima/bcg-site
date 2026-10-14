"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  ContactRound,
  Loader2,
} from "lucide-react";
import { BchEmptyState } from "@/components/dashboard/boston-city-hall/BchEmptyState";
import { BchKpiCard } from "@/components/dashboard/boston-city-hall/BchKpiCard";
import { BchSection } from "@/components/dashboard/boston-city-hall/BchSection";
import { BostonCityHallLogo } from "@/components/dashboard/boston-city-hall/BostonCityHallLogo";
import { bchEventWorkspacePath } from "@/components/dashboard/boston-city-hall/bch-app-shell.config";
import { pickFeaturedTicketingEvent } from "@/components/dashboard/boston-city-hall/bch-featured-event";
import { bchEventDisplayName } from "@/components/dashboard/boston-city-hall/bch-operational-display";
import { useBchTicketingEvents } from "@/components/dashboard/boston-city-hall/use-bch-ticketing-events";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { BCH_BTN_PRIMARY, BCH_CARD } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { api } from "@/lib/api";
import type { BchOperationalAlert, VenueOverview } from "@/types/boston-city-hall";
import {
  BOOKING_STATUS_COLOR,
  BOOKING_STATUS_LABEL,
  EVENT_STATUS_LABEL,
  PIPELINE_STAGE_CHART_COLOR,
  PIPELINE_STAGE_LABEL,
  PIPELINE_STAGES,
} from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const BCH_FINANCE_CURRENCY = "USD";

function formatBookingWhen(startIso: string, endIso: string): { date: string } {
  const start = new Date(startIso);
  const date = start.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
  const time = `${start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} – ${new Date(endIso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  return { date: `${date} · ${time}` };
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

function formatEventWhen(startDate: string | null): string {
  if (!startDate) return "Data a definir";
  const d = new Date(startDate);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" });
}

type Props = { overview: VenueOverview };

export function BostonCityHallVisaoGeral({ overview }: Props) {
  const { operationalEvents, loading: eventsLoading } = useBchTicketingEvents();
  const featured = useMemo(
    () => pickFeaturedTicketingEvent(operationalEvents),
    [operationalEvents],
  );

  const [alerts, setAlerts] = useState<BchOperationalAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setAlertsLoading(true);
    api
      .get<BchOperationalAlert[]>("/boston-city-hall/alerts?status=open&evaluate=1")
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

  const combinedEvents = useMemo(() => {
    const fromOps = operations.map((ev) => ({
      key: `op-${ev.bookingId}`,
      href: `${BCH_BASE}/operacao/${ev.bookingId}`,
      title: ev.contactName?.trim() || ev.title,
      subtitle: `${formatBookingWhen(ev.startAt, ev.endAt).date}${ev.spaceName ? ` · ${ev.spaceName}` : ""}`,
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
  const attention = overview.leadsNeedingAttention ?? [];

  const opShortcuts = featured
    ? [
        { label: "Preparação", href: `${bchEventWorkspacePath(featured.id)}` },
        { label: "Bilheteria", href: `${BCH_BASE}/ticketing?eventId=${encodeURIComponent(featured.id)}` },
        { label: "Check-in", href: `${BCH_BASE}/ticketing?tab=checkin&eventId=${encodeURIComponent(featured.id)}` },
        { label: "Bar e estoque", href: `${BCH_BASE}/bar/event-inventory` },
        { label: "Equipe", href: `${BCH_BASE}/operacao` },
        { label: "Resultado", href: `${BCH_BASE}/eventos/${encodeURIComponent(featured.id)}/financeiro` },
      ]
    : [
        { label: "Preparação", href: `${BCH_BASE}/eventos` },
        { label: "Bilheteria", href: `${BCH_BASE}/ticketing` },
        { label: "Check-in", href: `${BCH_BASE}/ticketing?tab=checkin` },
        { label: "Bar e estoque", href: `${BCH_BASE}/bar/dashboard` },
        { label: "Equipe", href: `${BCH_BASE}/operacao` },
        { label: "Resultado", href: `${BCH_BASE}/financeiro` },
      ];

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      <section
        className={cn(
          BCH_CARD,
          "overflow-hidden border-sky-500/15 bg-gradient-to-br from-[#0a1220] via-[#0c1018] to-[#070b12] p-0",
        )}
      >
        <div className="flex flex-col gap-4 p-4 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <BostonCityHallLogo size="lg" className="shrink-0 ring-1 ring-amber-500/30" />
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/90">
                Visão geral
              </p>
              {eventsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-sky-400/70" aria-label="Carregando" />
              ) : featured ? (
                <>
                  <h1 className="truncate text-2xl font-semibold text-slate-50 sm:text-3xl">
                    {bchEventDisplayName(featured.name)}
                  </h1>
                  <p className="text-sm text-slate-400">{formatEventWhen(featured.startDate)}</p>
                  <span className="inline-flex rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-200">
                    {EVENT_STATUS_LABEL[featured.status] ?? featured.status}
                  </span>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-semibold text-slate-50">Operação do venue</h1>
                  <p className="text-sm text-slate-400">Nenhum evento cadastrado para foco operacional.</p>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {featured ? (
              <Button asChild className={cn("min-h-[44px]", BCH_BTN_PRIMARY)}>
                <Link href={bchEventWorkspacePath(featured.id)}>
                  Centro do evento
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                </Link>
              </Button>
            ) : null}
            <Button
              asChild
              variant="outline"
              className="min-h-[44px] border-slate-700 bg-slate-900/40 text-slate-100"
            >
              <Link href={`${BCH_BASE}/eventos`}>Todos os eventos</Link>
            </Button>
          </div>
        </div>

        <div className="grid border-t border-slate-800/80 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {opShortcuts.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex min-h-[72px] flex-col justify-center border-slate-800/80 px-4 py-3 transition-colors hover:bg-sky-500/5 sm:border-r last:sm:border-r-0 xl:border-r xl:last:border-r-0 [&:not(:last-child)]:border-b sm:[&:not(:last-child)]:border-b-0 xl:[&:not(:last-child)]:border-b-0"
            >
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {item.label}
              </span>
              <span className="mt-0.5 text-sm font-medium text-sky-200/90">Abrir</span>
            </Link>
          ))}
        </div>
      </section>

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
        <BchSection title="Próximos eventos e reservas" actionHref={`${BCH_BASE}/eventos`} actionLabel="Eventos">
          {combinedEvents.length === 0 ? (
            <BchEmptyState icon={CalendarDays} message="Nenhum evento ou reserva próxima." />
          ) : (
            <ul className="space-y-2">
              {combinedEvents.map((row) => (
                <li key={row.key}>
                  <Link
                    href={row.href}
                    className="flex flex-col gap-1 rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-2.5 transition-colors hover:border-sky-500/25 sm:flex-row sm:items-center sm:justify-between"
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

        <BchSection title="Alertas" actionHref={`${BCH_BASE}/alerts`} actionLabel="Ver todos">
          {alertsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : alerts.length === 0 ? (
            <BchEmptyState icon={AlertTriangle} message="Nenhum alerta aberto no momento." />
          ) : (
            <ul className="space-y-2">
              {alerts.map((a) => (
                <li key={a.id}>
                  <Link
                    href={a.actionUrl ?? `${BCH_BASE}/alerts`}
                    className="block rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-2.5 hover:border-sky-500/25"
                  >
                    <p className="text-sm font-medium text-slate-100">{a.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{a.message}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </BchSection>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BchSection title="Funil comercial" actionHref={`${BCH_BASE}/pipeline`} actionLabel="Funil">
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
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Leads prioritários
              </p>
              <ul className="space-y-1.5">
                {attention.slice(0, 4).map((lead) => (
                  <li key={lead.id}>
                    <Link
                      href={`${BCH_BASE}/crm`}
                      className="flex items-center justify-between gap-2 text-sm text-slate-300 hover:text-sky-200"
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
              <FinanceLine
                label="Vencido"
                value={finance.overdueBalance}
                danger={Number.parseFloat(finance.overdueBalance) > 0}
              />
              <FinanceLine label="Vence em 14 dias" value={finance.dueSoonBalance} className="sm:col-span-2" />
              <p className="sm:col-span-2 text-[11px] text-slate-600">
                Valores em {BCH_FINANCE_CURRENCY}.
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
    <div className={cn("rounded-lg border border-slate-800/60 bg-slate-950/30 px-3 py-2", className)}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-lg font-semibold tabular-nums",
          danger ? "text-red-300" : emphasize ? "text-amber-200/95" : "text-slate-100",
        )}
      >
        {value}
      </p>
    </div>
  );
}
