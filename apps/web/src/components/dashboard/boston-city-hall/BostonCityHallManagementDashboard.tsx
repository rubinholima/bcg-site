"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, ClipboardList, ContactRound, Loader2, Plus } from "lucide-react";
import { BchEmptyState } from "@/components/dashboard/boston-city-hall/BchEmptyState";
import { BostonCityHallCreateBchEventDialog } from "@/components/dashboard/boston-city-hall/BostonCityHallCreateBchEventDialog";
import {
  BchActivityTimeline,
  BchFinanceProgress,
  BchPipelineDonut,
  type BchActivityItem,
} from "@/components/dashboard/boston-city-hall/bch-executive-dashboard-ui";
import { BchPageHeader } from "@/components/dashboard/boston-city-hall/BchPageHeader";
import { BchPageShell } from "@/components/dashboard/boston-city-hall/BchPageShell";
import { BchSection } from "@/components/dashboard/boston-city-hall/BchSection";
import {
  BCH_EXEC_KPI_LINKS,
  BCH_EXEC_KPI_NAV_HINTS,
  BCH_EXEC_PANEL_LINKS,
  bchPipelineStageHref,
} from "@/components/dashboard/boston-city-hall/bch-executive-dashboard-links";
import { bchEventWorkspacePath } from "@/components/dashboard/boston-city-hall/bch-app-shell.config";
import { bchEventDisplayName } from "@/components/dashboard/boston-city-hall/bch-operational-display";
import { useBchTicketingEvents } from "@/components/dashboard/boston-city-hall/use-bch-ticketing-events";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { BCH_BTN_PRIMARY, BCH_CARD, BCH_BTN_SECONDARY } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import type {
  BchOperationalAlert,
  VenueBooking,
  VenueContract,
  VenueOverview,
  VenueOperationListItem,
  VenueProposal,
} from "@/types/boston-city-hall";
import {
  BOOKING_STATUS_COLOR,
  BOOKING_STATUS_LABEL,
  PIPELINE_STAGE_CHART_COLOR,
  PIPELINE_STAGE_LABEL,
  PIPELINE_STAGES,
  VENUE_CONTRACT_STATUS_LABEL,
  VENUE_PROPOSAL_STATUS_LABEL,
} from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";

const FINANCE_CURRENCY_LABEL = "USD";

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatBookingTime(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  return `${start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

function formatMoneyUsd(value: string | number): string {
  const n = typeof value === "number" ? value : Number.parseFloat(value);
  if (Number.isNaN(n)) return String(value);
  return n.toLocaleString("pt-BR", { style: "currency", currency: FINANCE_CURRENCY_LABEL });
}

function formatDatePill(iso: string): { month: string; day: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { month: "—", day: "—" };
  return {
    month: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase(),
    day: d.toLocaleDateString("pt-BR", { day: "2-digit" }),
  };
}

function buildRecentActivities(
  proposals: VenueProposal[],
  contracts: VenueContract[],
  alerts: BchOperationalAlert[],
): BchActivityItem[] {
  const items: BchActivityItem[] = [];

  const recentProposals = [...proposals]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 12);
  const recentContracts = [...contracts]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8);

  for (const p of recentProposals) {
    const at = p.updatedAt || p.createdAt;
    let title = "Proposta atualizada";
    let tone: BchActivityItem["tone"] = "violet";
    if (p.status === "sent") {
      title = "Proposta enviada";
      tone = "sky";
    } else if (p.status === "draft") {
      title = "Proposta em rascunho";
      tone = "amber";
    }
    items.push({
      id: `prop-${p.id}`,
      at,
      title,
      subtitle: p.title || p.proposalNumber,
      href: `${BCH_BASE}/propostas/${p.id}`,
      tone,
    });
  }

  for (const c of recentContracts) {
    const at = c.updatedAt || c.createdAt;
    items.push({
      id: `cont-${c.id}`,
      at,
      title: c.status === "signed" ? "Contrato assinado" : "Contrato atualizado",
      subtitle: c.contractNumber,
      href: `${BCH_BASE}/contratos/${c.id}`,
      tone: c.status === "signed" ? "emerald" : "violet",
    });
  }

  for (const a of alerts) {
    items.push({
      id: `alert-${a.id}`,
      at: a.detectedAt || a.updatedAt || a.createdAt,
      title: a.title,
      subtitle: a.eventName ?? undefined,
      href: a.actionUrl ?? `${BCH_BASE}/alerts`,
      tone: a.severity === "critical" ? "rose" : a.severity === "warning" ? "amber" : "sky",
    });
  }

  return items
    .sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime())
    .slice(0, 8);
}

type Props = { overview: VenueOverview };

export function BostonCityHallManagementDashboard({ overview }: Props) {
  const { operationalEvents } = useBchTicketingEvents();
  const [todayBookings, setTodayBookings] = useState<VenueBooking[]>([]);
  const [operations, setOperations] = useState<VenueOperationListItem[]>([]);
  const [proposals, setProposals] = useState<VenueProposal[]>([]);
  const [contracts, setContracts] = useState<VenueContract[]>([]);
  const [alerts, setAlerts] = useState<BchOperationalAlert[]>([]);
  const [auxLoading, setAuxLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    let cancelled = false;
    setAuxLoading(true);
    Promise.all([
      api.get<VenueBooking[]>(
        `/boston-city-hall/bookings?from=${encodeURIComponent(todayIso)}&to=${encodeURIComponent(todayIso)}`,
      ),
      api.get<VenueOperationListItem[]>("/boston-city-hall/operations"),
      api.get<VenueProposal[]>("/boston-city-hall/proposals"),
      api.get<VenueContract[]>("/boston-city-hall/contracts"),
      api.get<BchOperationalAlert[]>("/boston-city-hall/alerts?status=open&evaluate=1"),
    ])
      .then(([bookingsRes, opsRes, propRes, contRes, alertsRes]) => {
        if (cancelled) return;
        setTodayBookings(Array.isArray(bookingsRes.data) ? bookingsRes.data : []);
        setOperations(Array.isArray(opsRes.data) ? opsRes.data : []);
        setProposals(Array.isArray(propRes.data) ? propRes.data : []);
        setContracts(Array.isArray(contRes.data) ? contRes.data : []);
        setAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
      })
      .catch(() => {
        if (!cancelled) {
          setTodayBookings([]);
          setOperations([]);
          setProposals([]);
          setContracts([]);
          setAlerts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setAuxLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [todayIso]);

  const eventIdByBookingId = useMemo(() => {
    const map = new Map<string, string>();
    for (const op of operations) {
      if (op.event?.id) map.set(op.bookingId, op.event.id);
    }
    return map;
  }, [operations]);

  const eventsTodayCount = useMemo(() => {
    const now = new Date();
    return operationalEvents.filter((ev) => {
      if (!ev.startDate) return false;
      const d = new Date(ev.startDate);
      return !Number.isNaN(d.getTime()) && isSameLocalDay(d, now);
    }).length;
  }, [operationalEvents]);

  const finance = overview.finance;
  const holdCount = overview.bookingsByStatus?.hold ?? 0;

  const openProposals = useMemo(
    () =>
      proposals
        .filter((p) => p.status === "draft" || p.status === "sent")
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 4),
    [proposals],
  );
  const actionContracts = useMemo(
    () =>
      contracts
        .filter((c) => c.status === "draft" || c.status === "sent")
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 4),
    [contracts],
  );
  const pendingCommercialCount = openProposals.length + actionContracts.length;
  const pendingActionsHref =
    openProposals.length > 0
      ? `${BCH_EXEC_PANEL_LINKS.proposals}`
      : actionContracts.length > 0
        ? BCH_EXEC_PANEL_LINKS.contracts
        : BCH_EXEC_PANEL_LINKS.pipeline;

  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [],
  );

  const operationSummary = useMemo(() => {
    const parts: string[] = [];
    parts.push(
      `${todayBookings.length} reserva${todayBookings.length === 1 ? "" : "s"} hoje`,
    );
    parts.push(`${eventsTodayCount} evento${eventsTodayCount === 1 ? "" : "s"} hoje`);
    if (holdCount > 0) {
      parts.push(`${holdCount} pré-reserva${holdCount === 1 ? "" : "s"} ativa${holdCount === 1 ? "" : "s"}`);
    }
    return parts.join(" · ");
  }, [todayBookings.length, eventsTodayCount, holdCount]);

  const pipelineSegments = useMemo(
    () =>
      PIPELINE_STAGES.filter((stage) => stage !== "perdido" && stage !== "confirmado").map(
        (stage) => ({
          key: stage,
          label: PIPELINE_STAGE_LABEL[stage] ?? stage,
          count: overview.pipelineByStage?.[stage] ?? 0,
          color: PIPELINE_STAGE_CHART_COLOR[stage] ?? "#64748b",
        }),
      ),
    [overview.pipelineByStage],
  );

  const upcoming = overview.upcomingBookings ?? [];

  const activities = useMemo(
    () => buildRecentActivities(proposals, contracts, alerts),
    [proposals, contracts, alerts],
  );

  const resolveEventHref = (bookingId: string, eventId?: string | null) => {
    const id = eventId ?? eventIdByBookingId.get(bookingId);
    if (id) return bchEventWorkspacePath(id);
    return `${BCH_BASE}/reservas?edit=${encodeURIComponent(bookingId)}`;
  };

  const financeNumbers = useMemo(() => {
    if (!finance) return null;
    return {
      contracted: Number.parseFloat(finance.totalContracted) || 0,
      received: Number.parseFloat(finance.totalReceived) || 0,
      open: Number.parseFloat(finance.openBalance) || 0,
      overdue: Number.parseFloat(finance.overdueBalance) || 0,
    };
  }, [finance]);

  const summaryMetrics = [
    {
      label: "Reservas hoje",
      value: String(todayBookings.length),
      href: BCH_EXEC_PANEL_LINKS.calendar,
    },
    {
      label: "Eventos hoje",
      value: String(eventsTodayCount),
      href: BCH_EXEC_KPI_LINKS.eventsToday,
    },
    {
      label: "Confirmadas à frente",
      value: String(overview.confirmedUpcoming ?? 0),
      href: BCH_EXEC_KPI_LINKS.confirmedBookings,
    },
    {
      label: "Oportunidades",
      value: String(overview.leadsOpen),
      href: BCH_EXEC_KPI_LINKS.openOpportunities,
    },
    {
      label: "Em aberto",
      value: finance ? formatMoneyUsd(finance.openBalance) : "—",
      href: BCH_EXEC_PANEL_LINKS.finance,
    },
    {
      label: "Alertas",
      value: String(alerts.length),
      href: BCH_EXEC_KPI_LINKS.operationalAlerts,
    },
  ];

  return (
    <BchPageShell className="space-y-5">
      <BchPageHeader
        title="Visão geral"
        breadcrumbs={[
          { href: BCH_BASE, label: "Boston City Hall" },
          { label: "Visão geral" },
        ]}
        actions={
          <>
            <Button asChild variant="outline" className={cn("min-h-[44px]", BCH_BTN_SECONDARY)}>
              <Link href={BCH_EXEC_PANEL_LINKS.events}>Eventos</Link>
            </Button>
            <Button
              type="button"
              className={cn("min-h-[44px] gap-2", BCH_BTN_PRIMARY)}
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Novo evento
            </Button>
          </>
        }
      />

      <div className="space-y-1">
        <p className="text-sm capitalize text-slate-400">{dateLabel}</p>
        <p className="text-sm text-slate-300">{operationSummary}</p>
        {pendingCommercialCount > 0 ? (
          <Link
            href={pendingActionsHref}
            className="inline-flex min-h-[36px] items-center rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 text-xs font-medium text-amber-100 hover:bg-amber-500/15"
          >
            {pendingCommercialCount} ação{pendingCommercialCount === 1 ? "" : "ões"} comercial
            {pendingCommercialCount === 1 ? "" : " pendente"}
          </Link>
        ) : null}
      </div>

      <section className={cn(BCH_CARD, "p-3 sm:p-4")}>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Resumo do dia</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {summaryMetrics.map((m) => (
            <Link
              key={m.label}
              href={m.href}
              className="rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-2.5 transition-colors hover:border-sky-500/35 hover:bg-slate-900/50"
            >
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{m.label}</p>
              <p className="mt-0.5 truncate text-base font-semibold tabular-nums text-slate-100">{m.value}</p>
            </Link>
          ))}
        </div>
        {holdCount > 0 ? (
          <p className="mt-2 text-[11px] text-slate-500">
            {holdCount} pré-reserva{holdCount === 1 ? "" : "s"} em hold.
          </p>
        ) : null}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <BchSection title="Operação de hoje" actionHref={BCH_EXEC_PANEL_LINKS.calendar} actionLabel="Calendário">
          {auxLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : todayBookings.length === 0 ? (
            <div className="space-y-3">
              <BchEmptyState message="Nenhuma reserva agendada para hoje." />
              <Button asChild variant="outline" size="sm" className={cn("min-h-[40px]", BCH_BTN_SECONDARY)}>
                <Link href={BCH_EXEC_PANEL_LINKS.reservas}>Nova reserva</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {todayBookings.map((b) => (
                <li key={b.id}>
                  <Link
                    href={resolveEventHref(b.id, b.event?.id)}
                    className="flex min-h-[48px] items-center gap-3 rounded-lg border border-slate-800/70 bg-slate-950/30 px-3 py-2.5 hover:border-sky-500/25"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-100">
                        {bchEventDisplayName(b.event?.name ?? b.title)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatBookingTime(b.startAt, b.endAt)}
                        {b.spaceName ? ` · ${b.spaceName}` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-medium",
                        BOOKING_STATUS_COLOR[b.status],
                      )}
                    >
                      {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </BchSection>

        <BchSection title="Próximos eventos e reservas" actionHref={BCH_EXEC_PANEL_LINKS.events} actionLabel="Eventos">
          {upcoming.length === 0 ? (
            <BchEmptyState message="Nenhuma reserva futura." />
          ) : (
            <ul className="space-y-2">
              {upcoming.slice(0, 8).map((b) => {
                const pill = formatDatePill(b.startAt);
                return (
                  <li key={b.id}>
                    <Link
                      href={resolveEventHref(b.id)}
                      className="flex min-h-[48px] gap-3 rounded-lg border border-slate-800/70 bg-slate-950/25 px-3 py-2.5 hover:border-sky-500/30"
                    >
                      <div className="flex w-10 shrink-0 flex-col items-center justify-center rounded-md bg-slate-900/80 py-0.5 text-center">
                        <span className="text-[9px] font-bold text-sky-400/90">{pill.month}</span>
                        <span className="text-sm font-semibold tabular-nums text-slate-100">{pill.day}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-100">{b.title}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(b.startAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {b.spaceName ? ` · ${b.spaceName}` : ""}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 self-center rounded-md border px-2 py-0.5 text-[10px]",
                          BOOKING_STATUS_COLOR[b.status],
                        )}
                      >
                        {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </BchSection>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <BchSection title="Comercial" actionHref={BCH_EXEC_PANEL_LINKS.pipeline} actionLabel="Funil">
          <BchPipelineDonut
            segments={pipelineSegments}
            totalLabel="Oportunidades"
            stageHref={bchPipelineStageHref}
            stageNavHint="Abre o funil. Não há filtro por estágio na URL."
          />
          {openProposals.length > 0 || actionContracts.length > 0 ? (
            <div className="mt-4 space-y-3 border-t border-slate-800/70 pt-3">
              {openProposals.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Propostas para ação
                  </p>
                  <ul className="space-y-1">
                    {openProposals.map((p) => (
                      <li key={p.id}>
                        <Link
                          href={`${BCH_BASE}/propostas/${p.id}`}
                          className="flex min-h-[40px] items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
                        >
                          <span className="truncate text-slate-300">{p.title || p.proposalNumber}</span>
                          <span className="shrink-0 text-xs text-slate-500">
                            {VENUE_PROPOSAL_STATUS_LABEL[p.status] ?? p.status}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {actionContracts.length > 0 ? (
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Contratos para ação
                  </p>
                  <ul className="space-y-1">
                    {actionContracts.map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`${BCH_BASE}/contratos/${c.id}`}
                          className="flex min-h-[40px] items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
                        >
                          <span className="truncate text-slate-300">{c.contractNumber}</span>
                          <span className="shrink-0 text-xs text-slate-500">
                            {VENUE_CONTRACT_STATUS_LABEL[c.status] ?? c.status}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </BchSection>

        <BchSection title="Financeiro do venue" actionHref={BCH_EXEC_PANEL_LINKS.finance} actionLabel="Financeiro">
          {!finance || !financeNumbers ? (
            <BchEmptyState message="Sem dados financeiros agregados." />
          ) : (
            <BchFinanceProgress
              totalContracted={financeNumbers.contracted}
              totalReceived={financeNumbers.received}
              openBalance={financeNumbers.open}
              overdueBalance={financeNumbers.overdue}
              formatMoney={(n) => formatMoneyUsd(n)}
              financeHref={BCH_EXEC_PANEL_LINKS.finance}
              financeNavHint={BCH_EXEC_KPI_NAV_HINTS.openReceivables}
            />
          )}
        </BchSection>

        <BchSection title="Atividades e atalhos" actionHref={BCH_EXEC_PANEL_LINKS.pipeline} actionLabel="Funil">
          {auxLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          ) : (
            <BchActivityTimeline items={activities.slice(0, 5)} />
          )}
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-800/70 pt-4">
            <QuickAction href={BCH_EXEC_PANEL_LINKS.reservas} icon={ClipboardList} label="Reservas" />
            <QuickAction href={BCH_EXEC_PANEL_LINKS.calendar} icon={CalendarDays} label="Calendário" />
            <QuickAction href={BCH_EXEC_PANEL_LINKS.crm} icon={ContactRound} label="CRM" />
            <QuickAction href={BCH_EXEC_PANEL_LINKS.reports} icon={BarChart3} label="Relatórios" />
          </div>
        </BchSection>
      </div>

      <BostonCityHallCreateBchEventDialog open={createOpen} onOpenChange={setCreateOpen} />
    </BchPageShell>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof CalendarDays;
  label: string;
}) {
  return (
    <Button
      asChild
      variant="outline"
      className="min-h-[44px] justify-start gap-2 border-slate-700/90 bg-slate-950/30 text-slate-200 hover:border-sky-500/30 hover:bg-slate-900/60"
    >
      <Link href={href}>
        <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <span className="truncate text-xs sm:text-sm">{label}</span>
      </Link>
    </Button>
  );
}
