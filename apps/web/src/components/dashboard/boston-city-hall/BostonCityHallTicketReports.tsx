"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import { BchEventListDiagnostics } from "@/components/dashboard/boston-city-hall/BchEventListDiagnostics";
import { useBchHubEventBinding } from "@/components/dashboard/boston-city-hall/use-bch-hub-event-binding";
import { cn } from "@/lib/utils";
import { BchCard } from "@/components/dashboard/boston-city-hall/BchCard";
import { BchEmptyState } from "@/components/dashboard/boston-city-hall/BchEmptyState";
import { BchEventSelectField } from "@/components/dashboard/boston-city-hall/BchEventSelectField";
import { BchKpiCard } from "@/components/dashboard/boston-city-hall/BchKpiCard";
import { BchLoadingBlock } from "@/components/dashboard/boston-city-hall/BchLoadingBlock";
import { BchTabBar } from "@/components/dashboard/boston-city-hall/BchTabBar";
import { BCH_CARD } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  EventTicketingEventListItem,
  TicketReportCapacity,
  TicketReportCheckin,
  TicketReportComplimentary,
  TicketReportOverview,
  TicketReportSales,
  TicketReportSeating,
  TicketReportTicketsPerformance,
} from "@/types/boston-city-hall";
import { formatTicketingMoney } from "@/types/boston-city-hall";
import {
  asArray,
  hasSeatingReportData,
  normalizeTicketReportSeating,
} from "@/components/dashboard/boston-city-hall/bch-ticket-report-utils";

const SECTIONS = [
  { id: "overview" as const, label: "Visão geral" },
  { id: "sales" as const, label: "Vendas" },
  { id: "tickets" as const, label: "Ingressos" },
  { id: "complimentary" as const, label: "Cortesias" },
  { id: "checkin" as const, label: "Check-in" },
  { id: "capacity" as const, label: "Capacidade" },
  { id: "seating" as const, label: "Mesas / assentos" },
];

function formatDay(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function BostonCityHallTicketReports() {
  const {
    events,
    eventId,
    setEventId,
    loading: loadingEvents,
    error: eventsError,
    rawCount,
    smokeHiddenCount,
    reload: reloadEvents,
  } = useBchHubEventBinding();
  const [section, setSection] = useState<(typeof SECTIONS)[number]["id"]>("overview");
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<TicketReportOverview | null>(null);
  const [sales, setSales] = useState<TicketReportSales | null>(null);
  const [ticketsPerf, setTicketsPerf] = useState<TicketReportTicketsPerformance | null>(null);
  const [complimentary, setComplimentary] = useState<TicketReportComplimentary | null>(null);
  const [checkin, setCheckin] = useState<TicketReportCheckin | null>(null);
  const [capacity, setCapacity] = useState<TicketReportCapacity | null>(null);
  const [seating, setSeating] = useState<TicketReportSeating | null>(null);

  const qs = useMemo(() => (eventId ? `?eventId=${encodeURIComponent(eventId)}` : ""), [eventId]);

  const loadOverview = useCallback(async () => {
    if (!eventId) return;
    const res = await api.get<TicketReportOverview>(`/boston-city-hall/ticketing/reports/overview${qs}`);
    setOverview(res.data ?? null);
  }, [eventId, qs]);

  const loadSection = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      if (section === "overview") {
        await loadOverview();
        return;
      }
      if (section === "sales") {
        const res = await api.get<TicketReportSales>(`/boston-city-hall/ticketing/reports/sales${qs}`);
        setSales(res.data ?? null);
        await loadOverview();
        return;
      }
      if (section === "tickets") {
        const res = await api.get<TicketReportTicketsPerformance>(
          `/boston-city-hall/ticketing/reports/tickets${qs}`,
        );
        setTicketsPerf(res.data ?? null);
        return;
      }
      if (section === "complimentary") {
        const res = await api.get<TicketReportComplimentary>(
          `/boston-city-hall/ticketing/reports/complimentary${qs}`,
        );
        setComplimentary(res.data ?? null);
        return;
      }
      if (section === "checkin") {
        const res = await api.get<TicketReportCheckin>(`/boston-city-hall/ticketing/reports/checkin${qs}`);
        setCheckin(res.data ?? null);
        return;
      }
      if (section === "capacity") {
        const res = await api.get<TicketReportCapacity>(`/boston-city-hall/ticketing/reports/capacity${qs}`);
        setCapacity(res.data ?? null);
        return;
      }
      if (section === "seating") {
        const res = await api.get<TicketReportSeating | null>(
          `/boston-city-hall/ticketing/reports/seating${qs}`,
        );
        setSeating(normalizeTicketReportSeating(res.data));
      }
    } finally {
      setLoading(false);
    }
  }, [eventId, qs, section, loadOverview]);

  useEffect(() => {
    void loadSection();
  }, [loadSection]);

  const currency = overview?.sales.currency ?? sales?.currency ?? "USD";

  const salesChart = useMemo(
    () =>
      (sales?.salesOverTime ?? []).map((p) => ({
        ...p,
        label: formatDay(p.date),
        revenueNum: Number.parseFloat(p.revenue) || 0,
      })),
    [sales?.salesOverTime],
  );

  const checkinChart = useMemo(
    () =>
      (checkin?.checkinsOverTime ?? []).map((p) => ({
        ...p,
        label: formatDay(p.date),
      })),
    [checkin?.checkinsOverTime],
  );

  const mixChart = useMemo(() => {
    if (!overview) return [];
    return [
      { name: "Vendidos", value: overview.tickets.paidIssued },
      { name: "Cortesias", value: overview.tickets.complimentaryIssued },
      { name: "Check-in", value: overview.tickets.checkedIn },
    ];
  }, [overview]);

  return (
    <div className="space-y-4">
      {eventsError || (!loadingEvents && events.length === 0) ? (
        <BchEventListDiagnostics
          error={eventsError}
          rawCount={rawCount}
          operationalCount={events.length}
          smokeHiddenCount={smokeHiddenCount}
          onRetry={() => void reloadEvents()}
        />
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <BchEventSelectField events={events} value={eventId} onChange={setEventId} />
      </div>

      <BchTabBar tabs={SECTIONS} active={section} onChange={setSection} />

      {!eventId ? (
        <BchCard>
          <BchEmptyState message="Selecione um evento para ver os relatórios de ingressos." />
        </BchCard>
      ) : loading && !overview ? (
        <BchLoadingBlock />
      ) : (
        <>
          {(section === "overview" || section === "sales") && overview ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <BchKpiCard
                label="Receita"
                value={formatTicketingMoney(overview.sales.grossAmount, currency)}
                tone="gold"
              />
              <BchKpiCard label="Pedidos confirmados" value={overview.orders.confirmed} />
              <BchKpiCard label="Ingressos vendidos" value={overview.sales.ticketsSold} />
              <BchKpiCard label="Cortesias" value={overview.tickets.complimentaryIssued} tone="info" />
              <BchKpiCard label="Check-ins" value={overview.tickets.checkedIn} tone="success" />
              <BchKpiCard label="Ocupação" value={`${overview.tickets.occupancyPercent}%`} />
              <BchKpiCard label="No-show" value={overview.tickets.noShow} tone="warning" />
              <BchKpiCard label="Capacidade restante" value={overview.capacity.remaining} />
            </div>
          ) : null}

          {section === "overview" && overview ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className={BCH_CARD}>
                  <p className="mb-2 text-sm font-medium text-slate-100">{overview.event.name}</p>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <dt className="text-muted-foreground">Ticketing</dt>
                    <dd>{overview.ticketing.enabled ? "Ativo" : "Inativo"}</dd>
                    <dt className="text-muted-foreground">Capacidade configurada</dt>
                    <dd>{overview.capacity.configured}</dd>
                    <dt className="text-muted-foreground">Comprometido</dt>
                    <dd>{overview.capacity.committed}</dd>
                    <dt className="text-muted-foreground">Pedidos pendentes</dt>
                    <dd>{overview.orders.pending}</dd>
                    <dt className="text-muted-foreground">No-show pago / cortesia</dt>
                    <dd>
                      {overview.tickets.paidNoShow} / {overview.tickets.complimentaryNoShow}
                    </dd>
                  </dl>
                  <p className="mt-4 text-xs text-slate-500">{overview.financeReconciliation.note}</p>
              </div>
              {mixChart.some((x) => x.value > 0) ? (
                <div className={cn(BCH_CARD, "h-64 pt-2")}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mixChart}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            color: "hsl(var(--foreground))",
                          }}
                        />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                </div>
              ) : null}
            </div>
          ) : null}

          {section === "sales" && sales ? (
            <div className="space-y-4">
              {salesChart.length > 0 ? (
                <div className={cn(BCH_CARD, "h-64 pt-2")}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={salesChart}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <Tooltip
                          formatter={(v) =>
                            formatTicketingMoney(String(v ?? 0), currency)
                          }
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            color: "hsl(var(--foreground))",
                          }}
                        />
                        <Line type="monotone" dataKey="revenueNum" stroke="hsl(var(--primary))" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                </div>
              ) : null}
              <ReportTable
                title="Vendas por tipo"
                headers={["Tipo", "Qtd", "Receita", "Ticket médio"]}
                rows={asArray(sales.byTicketType).map((r) => [
                  r.ticketTypeName,
                  String(r.ticketsSold),
                  formatTicketingMoney(r.revenue, currency),
                  r.averageUnitPrice ? formatTicketingMoney(r.averageUnitPrice, currency) : "—",
                ])}
              />
              {asArray(sales.byLot).length > 0 ? (
                <ReportTable
                  title="Vendas por lote"
                  headers={["Lote", "Tipo", "Qtd", "Receita"]}
                  rows={asArray(sales.byLot).map((r) => [
                    r.lotName,
                    r.ticketTypeName,
                    String(r.ticketsSold),
                    formatTicketingMoney(r.revenue, currency),
                  ])}
                />
              ) : null}
            </div>
          ) : null}

          {section === "tickets" && ticketsPerf ? (
            <ReportTable
              title="Desempenho por tipo / lote"
              headers={[
                "Tipo",
                "Lote",
                "Cap.",
                "Vendidos",
                "Cortesia",
                "Emitidos",
                "Usados",
                "Receita",
                "Uso %",
              ]}
              rows={asArray(ticketsPerf.typeAndLotPerformance).map((r) => [
                r.ticketTypeName,
                r.lotName ?? "—",
                String(r.capacity),
                String(r.sold),
                String(r.complimentary),
                String(r.issued),
                String(r.used),
                formatTicketingMoney(r.revenue, currency),
                `${r.usagePercent}%`,
              ])}
            />
          ) : null}

          {section === "complimentary" && complimentary ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {complimentary.summary.faceValueLabel}:{" "}
                <span className="font-medium text-foreground">
                  {formatTicketingMoney(complimentary.summary.faceValueTotal, complimentary.currency)}
                </span>
              </p>
              <ReportTable
                title="Por motivo"
                headers={["Motivo", "Emitidos", "Usados", "Não usados"]}
                rows={asArray(complimentary.byReason).map((r) => [
                  r.reasonLabel,
                  String(r.issued),
                  String(r.used),
                  String(r.unused),
                ])}
              />
              <ReportTable
                title="Por tipo de ingresso"
                headers={["Tipo", "Emitidos", "Usados", "Valor de face"]}
                rows={asArray(complimentary.byTicketType).map((r) => [
                  r.ticketTypeName,
                  String(r.issued),
                  String(r.used),
                  formatTicketingMoney(r.faceValueTotal, complimentary.currency),
                ])}
              />
            </div>
          ) : null}

          {section === "checkin" && checkin ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <BchKpiCard label="Entradas aceitas" value={checkin.summary.acceptedAttempts} tone="success" />
                <BchKpiCard label="Tickets únicos (used)" value={checkin.summary.uniqueCheckedInTickets} />
                <BchKpiCard label="Já utilizado" value={checkin.summary.alreadyUsedAttempts} tone="warning" />
                <BchKpiCard label="Inválidos" value={checkin.summary.invalidAttempts} tone="danger" />
              </div>
              {checkinChart.length > 0 ? (
                <div className={cn(BCH_CARD, "h-64 pt-2")}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={checkinChart}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--popover))",
                            border: "1px solid hsl(var(--border))",
                            color: "hsl(var(--foreground))",
                          }}
                        />
                        <Line type="monotone" dataKey="accepted" name="Aceitos" stroke="#34d399" strokeWidth={2} />
                        <Line type="monotone" dataKey="rejected" name="Rejeitados" stroke="#f87171" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                </div>
              ) : null}
              <ReportTable
                title="Por tipo"
                headers={["Tipo", "Tentativas aceitas", "Tickets usados"]}
                rows={asArray(checkin.byTicketType).map((r) => [
                  r.ticketTypeName,
                  String(r.accepted),
                  String(r.uniqueUsed),
                ])}
              />
              <ReportTable
                title="Por estação"
                headers={["Estação", "Tentativas", "Aceitas"]}
                rows={asArray(checkin.byStation).map((r) => [
                  r.stationLabel,
                  String(r.attempts),
                  String(r.accepted),
                ])}
              />
            </div>
          ) : null}

          {section === "capacity" && capacity ? (
            <ReportTable
              title="Capacidade por tipo"
              headers={["Tipo", "Cap.", "Vendidos", "Hold", "Disp.", "Cortesia", "Emitidos", "Check-in"]}
              rows={asArray(capacity.byTicketType).map((r) => [
                r.ticketTypeName,
                String(r.capacity),
                String(r.sold),
                String(r.held),
                String(r.available),
                String(r.complimentary),
                String(r.issued),
                String(r.used),
              ])}
            />
          ) : null}

          {section === "seating" ? (
            hasSeatingReportData(seating) && seating ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <BchKpiCard label="Mesas" value={seating.tablesConfigured} />
                  <BchKpiCard label="Assentos" value={seating.seatsConfigured} />
                  <BchKpiCard label="Assentos atribuídos" value={seating.assignedSeats} />
                  <BchKpiCard label="Assentos usados" value={seating.usedAssignedSeats} tone="success" />
                </div>
                <ReportTable
                  title="Por mesa"
                  headers={["Mesa", "Cap.", "Atribuídos", "Usados"]}
                  rows={asArray(seating.byTable).map((r) => [
                    r.tableName,
                    String(r.capacity),
                    String(r.assigned),
                    String(r.used),
                  ])}
                />
                {asArray(seating.bySection).length > 0 ? (
                  <ReportTable
                    title="Por setor"
                    headers={["Setor", "Atribuídos", "Usados"]}
                    rows={asArray(seating.bySection).map((r) => [
                      r.section,
                      String(r.assigned),
                      String(r.used),
                    ])}
                  />
                ) : null}
              </div>
            ) : (
              <BchCard>
                <BchEmptyState message="Assentos não habilitados ou sem dados de mesa para este evento." />
              </BchCard>
            )
          ) : null}
        </>
      )}
    </div>
  );
}

function ReportTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  if (rows.length === 0) return null;
  return (
    <section className={BCH_CARD}>
        <p className="mb-3 text-sm font-medium text-slate-100">{title}</p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  {row.map((cell, j) => (
                    <TableCell key={j}>{cell}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
    </section>
  );
}
