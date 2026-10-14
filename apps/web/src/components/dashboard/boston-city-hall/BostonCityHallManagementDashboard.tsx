"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  ClipboardList,
  ContactRound,
  FileText,
  Loader2,
  Plus,
  Wallet,
} from "lucide-react";
import { BchEmptyState } from "@/components/dashboard/boston-city-hall/BchEmptyState";
import { BostonCityHallCreateBchEventDialog } from "@/components/dashboard/boston-city-hall/BostonCityHallCreateBchEventDialog";
import {
  BchActivityTimeline,
  BchExecutiveHero,
  BchExecutiveKpiCard,
  BchExecutivePanel,
  BchFinanceProgress,
  BchPipelineDonut,
  leadSparklineFromOverview,
  leadsWeekOverWeekHint,
  type BchActivityItem,
} from "@/components/dashboard/boston-city-hall/bch-executive-dashboard-ui";
import { bchEventWorkspacePath } from "@/components/dashboard/boston-city-hall/bch-app-shell.config";
import { bchEventDisplayName } from "@/components/dashboard/boston-city-hall/bch-operational-display";
import { useBchTicketingEvents } from "@/components/dashboard/boston-city-hall/use-bch-ticketing-events";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
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

  for (const p of proposals) {
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

  for (const c of contracts) {
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
  const leadSpark = leadSparklineFromOverview(overview.leadsLast30Days ?? []);
  const leadHint = leadsWeekOverWeekHint(overview.leadsLast30Days ?? []);

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
  const featuredToday = todayBookings[0] ?? null;
  const restToday = todayBookings.slice(1);

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
    };
  }, [finance]);

  return (
    <div className="w-full space-y-5 pb-2">
      <BchExecutiveHero />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <BchExecutiveKpiCard
          label="Eventos hoje"
          value={eventsTodayCount}
          icon={CalendarDays}
          accent="emerald"
        />
        <BchExecutiveKpiCard
          label="Próximas reservas"
          value={overview.upcomingBookingsTotal ?? 0}
          hint="Ativas à frente"
          icon={ClipboardList}
          accent="sky"
        />
        <BchExecutiveKpiCard
          label="Reservas confirmadas"
          value={overview.confirmedUpcoming ?? 0}
          icon={CalendarDays}
          accent="violet"
        />
        <BchExecutiveKpiCard
          label="Oportunidades abertas"
          value={overview.leadsOpen}
          hint={leadHint}
          icon={ContactRound}
          accent="amber"
          sparkline={leadSpark}
        />
        <BchExecutiveKpiCard
          label="Recebíveis em aberto"
          value={finance ? formatMoneyUsd(finance.openBalance) : "—"}
          icon={Wallet}
          accent="teal"
          barChart={
            financeNumbers
              ? { received: financeNumbers.received, open: financeNumbers.open }
              : undefined
          }
        />
        <BchExecutiveKpiCard
          label="Alertas operacionais"
          value={alerts.length}
          icon={AlertTriangle}
          accent="rose"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <BchExecutivePanel title="Operação de hoje" href={`${BCH_BASE}/agenda`} linkLabel="Calendário">
          {auxLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : todayBookings.length === 0 ? (
            <BchEmptyState message="Nenhuma reserva agendada para hoje." />
          ) : (
            <div className="space-y-3">
              {featuredToday ? (
                <div className="overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950/50">
                  <div className="flex flex-col sm:flex-row">
                    <div className="flex min-h-[100px] flex-1 flex-col justify-between gap-3 p-4 sm:p-5">
                      <div>
                        <p className="text-xs font-medium tabular-nums text-sky-400/90">
                          {formatBookingTime(featuredToday.startAt, featuredToday.endAt)}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-slate-50">
                          {bchEventDisplayName(featuredToday.event?.name ?? featuredToday.title)}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-500">
                          {featuredToday.spaceName ?? "Espaço do venue"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "rounded-md border px-2.5 py-0.5 text-xs font-medium",
                            BOOKING_STATUS_COLOR[featuredToday.status],
                          )}
                        >
                          {BOOKING_STATUS_LABEL[featuredToday.status] ?? featuredToday.status}
                        </span>
                        <Button asChild size="sm" className="min-h-[36px] bg-sky-600 hover:bg-sky-500">
                          <Link href={resolveEventHref(featuredToday.id, featuredToday.event?.id)}>
                            Abrir evento
                          </Link>
                        </Button>
                      </div>
                    </div>
                    <div
                      className="relative min-h-[88px] w-full shrink-0 border-t border-slate-800/80 bg-gradient-to-br from-slate-900 via-[#0f172a] to-sky-950/40 sm:min-h-0 sm:w-[140px] sm:border-l sm:border-t-0 lg:w-[168px]"
                      aria-hidden
                    >
                      <div className="absolute inset-0 flex items-center justify-center opacity-40">
                        <CalendarDays className="h-12 w-12 text-sky-500/50" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              {restToday.length > 0 ? (
                <ul className="space-y-2">
                  {restToday.map((b) => (
                    <li key={b.id}>
                      <Link
                        href={resolveEventHref(b.id, b.event?.id)}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-800/70 bg-slate-950/30 px-3 py-2.5 hover:border-sky-500/25"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-100">
                            {bchEventDisplayName(b.event?.name ?? b.title)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatBookingTime(b.startAt, b.endAt)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-md border px-2 py-0.5 text-[10px]",
                            BOOKING_STATUS_COLOR[b.status],
                          )}
                        >
                          {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </BchExecutivePanel>

        <BchExecutivePanel
          title="Próximos eventos e reservas"
          href={`${BCH_BASE}/eventos`}
          linkLabel="Eventos"
        >
          {upcoming.length === 0 ? (
            <BchEmptyState message="Nenhuma reserva futura." />
          ) : (
            <ul className="space-y-2">
              {upcoming.slice(0, 7).map((b) => {
                const pill = formatDatePill(b.startAt);
                return (
                  <li key={b.id}>
                    <div className="flex gap-3 rounded-lg border border-slate-800/70 bg-slate-950/25 px-2 py-2.5 sm:px-3">
                      <div className="flex w-11 shrink-0 flex-col items-center justify-center rounded-md bg-slate-900/80 py-1 text-center ring-1 ring-slate-800/80">
                        <span className="text-[9px] font-bold tracking-wide text-sky-400/90">
                          {pill.month}
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-slate-100">
                          {pill.day}
                        </span>
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
                      <div className="flex shrink-0 flex-col items-end justify-center gap-1.5">
                        <span
                          className={cn(
                            "rounded-md border px-2 py-0.5 text-[10px]",
                            BOOKING_STATUS_COLOR[b.status],
                          )}
                        >
                          {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                        </span>
                        <Button asChild variant="outline" size="sm" className="h-7 border-slate-700 px-2.5 text-xs">
                          <Link href={resolveEventHref(b.id)}>Abrir</Link>
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </BchExecutivePanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
        <BchExecutivePanel title="Comercial" href={`${BCH_BASE}/pipeline`} linkLabel="Funil">
          <BchPipelineDonut segments={pipelineSegments} totalLabel="Oportunidades" />
        </BchExecutivePanel>

        <BchExecutivePanel title="Financeiro do venue" href={`${BCH_BASE}/financeiro`} linkLabel="Financeiro">
          {!finance || !financeNumbers ? (
            <BchEmptyState message="Sem dados financeiros agregados." />
          ) : (
            <BchFinanceProgress
              totalContracted={financeNumbers.contracted}
              totalReceived={financeNumbers.received}
              openBalance={financeNumbers.open}
              formatMoney={(n) => formatMoneyUsd(n)}
            />
          )}
        </BchExecutivePanel>

        <BchExecutivePanel title="Atividades recentes" href={`${BCH_BASE}/crm`} linkLabel="Comercial">
          {auxLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          ) : (
            <BchActivityTimeline items={activities} />
          )}
        </BchExecutivePanel>

        <BchExecutivePanel title="Ações rápidas">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              className="col-span-2 min-h-[44px] gap-2 bg-sky-600 text-white hover:bg-sky-500"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Novo evento
            </Button>
            <QuickAction href={`${BCH_BASE}/reservas`} icon={ClipboardList} label="Nova reserva" />
            <QuickAction href={`${BCH_BASE}/agenda`} icon={CalendarDays} label="Calendário" />
            <QuickAction href={`${BCH_BASE}/crm`} icon={ContactRound} label="Comercial" />
            <QuickAction href={`${BCH_BASE}/financeiro`} icon={Wallet} label="Financeiro" />
            <QuickAction href={`${BCH_BASE}/executive`} icon={BarChart3} label="Relatórios" />
            <QuickAction href={`${BCH_BASE}/propostas`} icon={FileText} label="Propostas" />
          </div>
        </BchExecutivePanel>
      </div>

      <BostonCityHallCreateBchEventDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
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
