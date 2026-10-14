"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  ContactRound,
  Loader2,
  Plus,
  Wallet,
} from "lucide-react";
import { BchEmptyState } from "@/components/dashboard/boston-city-hall/BchEmptyState";
import { BchKpiCard } from "@/components/dashboard/boston-city-hall/BchKpiCard";
import { BostonCityHallCreateBchEventDialog } from "@/components/dashboard/boston-city-hall/BostonCityHallCreateBchEventDialog";
import { BostonCityHallLogo } from "@/components/dashboard/boston-city-hall/BostonCityHallLogo";
import { bchEventWorkspacePath } from "@/components/dashboard/boston-city-hall/bch-app-shell.config";
import { bchEventDisplayName } from "@/components/dashboard/boston-city-hall/bch-operational-display";
import { useBchTicketingEvents } from "@/components/dashboard/boston-city-hall/use-bch-ticketing-events";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { BCH_BTN_PRIMARY, BCH_CARD } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
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

function formatMoneyUsd(value: string): string {
  const n = Number.parseFloat(value);
  if (Number.isNaN(n)) return value;
  return n.toLocaleString("pt-BR", { style: "currency", currency: FINANCE_CURRENCY_LABEL });
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
  const openProposals = useMemo(
    () => proposals.filter((p) => p.status === "draft" || p.status === "sent").slice(0, 5),
    [proposals],
  );
  const actionContracts = useMemo(
    () => contracts.filter((c) => c.status === "draft" || c.status === "sent").slice(0, 5),
    [contracts],
  );

  const pipelineOpen = useMemo(
    () =>
      PIPELINE_STAGES.map((stage) => ({
        stage,
        label: PIPELINE_STAGE_LABEL[stage] ?? stage,
        count: overview.pipelineByStage?.[stage] ?? 0,
      })).filter(
        (s) => s.count > 0 && s.stage !== "confirmado" && s.stage !== "perdido",
      ),
    [overview.pipelineByStage],
  );

  const upcoming = overview.upcomingBookings ?? [];

  const resolveEventHref = (bookingId: string, eventId?: string | null) => {
    const id = eventId ?? eventIdByBookingId.get(bookingId);
    if (id) return bchEventWorkspacePath(id);
    return `${BCH_BASE}/reservas?edit=${encodeURIComponent(bookingId)}`;
  };

  return (
    <div className="w-full space-y-5">
      <header className={cn(BCH_CARD, "border-sky-500/15 bg-gradient-to-r from-[#0a101c] via-[#0c1222] to-[#0a101c]")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <BostonCityHallLogo size="lg" className="shrink-0 ring-1 ring-amber-500/30" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500/90">
                Boston City Hall
              </p>
              <h1 className="text-2xl font-semibold text-slate-50 sm:text-3xl">Visão Geral</h1>
              <p className="mt-1 text-sm text-slate-400">Gestão e operação do estabelecimento</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <BchKpiCard label="Eventos hoje" value={eventsTodayCount} icon={CalendarDays} tone="info" />
        <BchKpiCard
          label="Próximas reservas"
          value={overview.upcomingBookingsTotal ?? 0}
          hint="Ativas à frente"
          icon={ClipboardList}
          tone="gold"
        />
        <BchKpiCard
          label="Reservas confirmadas"
          value={overview.confirmedUpcoming ?? 0}
          icon={CalendarDays}
          tone="success"
        />
        <BchKpiCard
          label="Oportunidades abertas"
          value={overview.leadsOpen}
          icon={ContactRound}
          tone="warning"
        />
        <BchKpiCard
          label="Recebíveis em aberto"
          value={finance ? formatMoneyUsd(finance.openBalance) : "—"}
          hint={finance ? FINANCE_CURRENCY_LABEL : undefined}
          icon={Wallet}
          tone="gold"
        />
        <BchKpiCard
          label="Alertas operacionais"
          value={alerts.length}
          icon={AlertTriangle}
          tone={alerts.length > 0 ? "danger" : "default"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <MgmtSection title="Operação de hoje" href={`${BCH_BASE}/agenda`} linkLabel="Calendário">
          {auxLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          ) : todayBookings.length === 0 ? (
            <BchEmptyState message="Nenhuma reserva agendada para hoje." />
          ) : (
            <ul className="space-y-2">
              {todayBookings.map((b) => (
                <li key={b.id}>
                  <Link
                    href={resolveEventHref(b.id, b.event?.id)}
                    className="flex flex-col gap-1 rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-2.5 hover:border-sky-500/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-100">
                        {bchEventDisplayName(b.event?.name ?? b.title)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatBookingTime(b.startAt, b.endAt)}
                        {b.spaceName ? ` · ${b.spaceName}` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-md border px-2 py-0.5 text-xs",
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
        </MgmtSection>

        <MgmtSection title="Próximos eventos e reservas" href={`${BCH_BASE}/eventos`} linkLabel="Eventos">
          {upcoming.length === 0 ? (
            <BchEmptyState message="Nenhuma reserva futura." />
          ) : (
            <ul className="space-y-2">
              {upcoming.slice(0, 8).map((b) => (
                <li key={b.id}>
                  <Link
                    href={resolveEventHref(b.id)}
                    className="flex flex-col gap-1 rounded-lg border border-slate-800/80 bg-slate-950/40 px-3 py-2.5 hover:border-sky-500/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-100">{b.title}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(b.startAt).toLocaleString("pt-BR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                        {b.spaceName ? ` · ${b.spaceName}` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-md border px-2 py-0.5 text-xs",
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
        </MgmtSection>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <MgmtSection title="Comercial" href={`${BCH_BASE}/pipeline`} linkLabel="Funil">
          <div className="space-y-3">
            {pipelineOpen.length > 0 ? (
              <ul className="space-y-1.5">
                {pipelineOpen.map(({ stage, label, count }) => (
                  <li key={stage} className="flex justify-between text-sm">
                    <span className="text-slate-400">{label}</span>
                    <span className="font-semibold tabular-nums text-slate-100">{count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Funil sem leads ativos.</p>
            )}
            {openProposals.length > 0 ? (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Propostas</p>
                <ul className="space-y-1.5">
                  {openProposals.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`${BCH_BASE}/propostas/${p.id}`}
                        className="flex justify-between gap-2 text-sm text-slate-300 hover:text-sky-200"
                      >
                        <span className="truncate">{p.title || p.proposalNumber}</span>
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
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Contratos</p>
                <ul className="space-y-1.5">
                  {actionContracts.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`${BCH_BASE}/contratos/${c.id}`}
                        className="flex justify-between gap-2 text-sm text-slate-300 hover:text-sky-200"
                      >
                        <span className="truncate">{c.contractNumber}</span>
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
        </MgmtSection>

        <MgmtSection title="Financeiro do venue" href={`${BCH_BASE}/financeiro`} linkLabel="Financeiro">
          {!finance ? (
            <BchEmptyState message="Sem dados financeiros agregados." />
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">Valores em {FINANCE_CURRENCY_LABEL} · recebíveis do venue</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <FinanceCell label="Contratado" value={formatMoneyUsd(finance.totalContracted)} />
                <FinanceCell label="Recebido" value={formatMoneyUsd(finance.totalReceived)} />
                <FinanceCell label="Em aberto" value={formatMoneyUsd(finance.openBalance)} highlight />
                <FinanceCell
                  label="Vencido"
                  value={formatMoneyUsd(finance.overdueBalance)}
                  danger={Number.parseFloat(finance.overdueBalance) > 0}
                />
              </div>
              <p className="text-[11px] text-slate-600">
                Não inclui margem operacional por evento — use o workspace do evento para resultado parcial.
              </p>
            </div>
          )}
        </MgmtSection>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(280px,360px)]">
        <MgmtSection title="Ações rápidas" href={BCH_BASE} linkLabel="">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className={cn("min-h-[44px] gap-2", BCH_BTN_PRIMARY)}
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4" aria-hidden />
              Novo evento
            </Button>
            <Button asChild variant="outline" className="min-h-[44px] border-slate-700">
              <Link href={`${BCH_BASE}/reservas`}>Nova reserva</Link>
            </Button>
            <Button asChild variant="outline" className="min-h-[44px] border-slate-700">
              <Link href={`${BCH_BASE}/agenda`}>Calendário</Link>
            </Button>
            <Button asChild variant="outline" className="min-h-[44px] border-slate-700">
              <Link href={`${BCH_BASE}/crm`}>Comercial</Link>
            </Button>
            <Button asChild variant="outline" className="min-h-[44px] border-slate-700">
              <Link href={`${BCH_BASE}/financeiro`}>Financeiro</Link>
            </Button>
            <Button asChild variant="outline" className="min-h-[44px] border-slate-700">
              <Link href={`${BCH_BASE}/executive`}>Relatórios</Link>
            </Button>
          </div>
        </MgmtSection>

        <MgmtSection title="Alertas" href={`${BCH_BASE}/alerts`} linkLabel="Ver todos">
          {auxLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          ) : alerts.length === 0 ? (
            <BchEmptyState icon={AlertTriangle} message="Nenhum alerta aberto." />
          ) : (
            <ul className="space-y-2">
              {alerts.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <Link
                    href={a.actionUrl ?? `${BCH_BASE}/alerts`}
                    className={cn(
                      "block rounded-lg border px-3 py-2.5",
                      a.severity === "critical"
                        ? "border-red-500/30 bg-red-500/10"
                        : a.severity === "warning"
                          ? "border-amber-500/25 bg-amber-500/10"
                          : "border-slate-800/80 bg-slate-950/40",
                    )}
                  >
                    <p className="text-sm font-medium text-slate-100">{a.title}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </MgmtSection>
      </div>

      <BostonCityHallCreateBchEventDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}

function MgmtSection({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn(BCH_CARD, "min-h-[120px]")}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
        {linkLabel ? (
          <Link href={href} className="text-xs font-medium text-sky-300 hover:text-sky-200">
            {linkLabel}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function FinanceCell({
  label,
  value,
  highlight,
  danger,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-800/70 bg-slate-950/30 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-base font-semibold tabular-nums",
          danger ? "text-red-300" : highlight ? "text-amber-200/95" : "text-slate-100",
        )}
      >
        {value}
      </p>
    </div>
  );
}
