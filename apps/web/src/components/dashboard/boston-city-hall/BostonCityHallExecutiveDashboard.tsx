"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BchFilterBar } from "@/components/dashboard/boston-city-hall/BchFilterBar";
import { BchKpiCard } from "@/components/dashboard/boston-city-hall/BchKpiCard";
import { BCH_BTN_PRIMARY, BCH_CARD } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import type {
  BchAlertType,
  BchExecutiveEventsResponse,
  BchExecutiveSummaryResponse,
  BchEventFinancialCurrencyGroup,
  BchOperationalAlert,
} from "@/types/boston-city-hall";
import {
  BCH_ALERT_TYPE_LABEL,
  EVENT_STATUS_LABEL,
  formatCatalogMoney,
} from "@/types/boston-city-hall";

const BCH = "/dashboard/eventos/boston-city-hall";

type PeriodPreset = "today" | "this_week" | "this_month" | "custom";

function money(currency: string, amount: string | null | undefined): string {
  if (amount == null) return "—";
  return `${currency} ${amount}`;
}

function CurrencyBlocks({ groups }: { groups: BchEventFinancialCurrencyGroup[] }) {
  if (!groups.length) {
    return <p className="text-sm text-muted-foreground">Sem movimentação no período.</p>;
  }
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {groups.map((g) => (
        <div key={g.currency} className={cn(BCH_CARD)}>
          <h3 className="mb-3 text-sm font-semibold text-amber-100/90">{g.currency}</h3>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Receita</p>
              <p className="font-medium">{money(g.currency, g.grossOperationalRevenue)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Recebido / aberto</p>
              <p>{money(g.currency, g.collected)}</p>
              <p className="text-muted-foreground text-xs">
                Aberto: {money(g.currency, g.outstanding)}
                {g.overdue != null ? ` · Vencido: ${money(g.currency, g.overdue)}` : ""}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Custo conhecido</p>
              <p>{money(g.currency, g.knownOperationalCost)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Resultado operacional</p>
              <p className="font-medium">
                {money(g.currency, g.operationalResult)}
                {g.operationalMarginPct ? (
                  <span className="ml-1 font-normal text-muted-foreground">({g.operationalMarginPct}%)</span>
                ) : null}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AlertPills({ alerts }: { alerts: Array<{ alertType: BchAlertType; title: string }> }) {
  if (!alerts.length) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {alerts.map((a) => (
        <span
          key={`${a.alertType}-${a.title}`}
          className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-100 ring-1 ring-amber-500/30"
        >
          {BCH_ALERT_TYPE_LABEL[a.alertType] ?? a.title}
        </span>
      ))}
    </div>
  );
}

export function BostonCityHallExecutiveDashboard() {
  const [preset, setPreset] = useState<PeriodPreset>("this_month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [summary, setSummary] = useState<BchExecutiveSummaryResponse | null>(null);
  const [events, setEvents] = useState<BchExecutiveEventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("period", preset);
    if (preset === "custom") {
      if (from) p.set("from", from);
      if (to) p.set("to", to);
    }
    return p.toString();
  }, [preset, from, to]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = queryString;
      const [s, e] = await Promise.all([
        api.get<BchExecutiveSummaryResponse>(`/boston-city-hall/executive/summary?${qs}`),
        api.get<BchExecutiveEventsResponse>(`/boston-city-hall/executive/events?${qs}`),
      ]);
      setSummary(s.data);
      setEvents(e.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar dashboard executivo.");
    } finally {
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    void load();
  }, [load]);

  const mixCharts = useMemo(() => {
    if (!summary?.revenueMix.length) return [];
    return summary.revenueMix.map((m) => ({
      currency: m.currency,
      data: [
        { name: "Ingressos", value: Number(m.ticketing) },
        { name: "Bar", value: Number(m.bar) },
        { name: "Venue", value: Number(m.venue) },
      ],
    }));
  }, [summary?.revenueMix]);

  const trendByCurrency = useMemo(() => {
    const map = new Map<string, { date: string; revenue: number; attendance: number }[]>();
    for (const pt of summary?.revenueTrend ?? []) {
      const list = map.get(pt.currency) ?? [];
      list.push({ date: pt.date.slice(5), revenue: Number(pt.grossOperationalRevenue), attendance: pt.attendance });
      map.set(pt.currency, list);
    }
    return map;
  }, [summary?.revenueTrend]);

  if (loading && !summary) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-8">
          <p className="text-sm text-red-300">{error}</p>
          <Button type="button" variant="outline" onClick={() => void load()}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!summary || !events) return null;

  return (
    <div className="space-y-6">
      <BchFilterBar>
        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs text-muted-foreground">Período</label>
          <NativeSelect value={preset} onChange={(e) => setPreset(e.target.value as PeriodPreset)}>
            <option value="today">Hoje</option>
            <option value="this_week">Esta semana</option>
            <option value="this_month">Este mês</option>
            <option value="custom">Personalizado</option>
          </NativeSelect>
        </div>
        {preset === "custom" ? (
          <>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">De</label>
              <Input
                type="date"
                className="text-foreground"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Até</label>
              <Input type="date" className="text-foreground" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </>
        ) : null}
        <Button
          type="button"
          className={cn("min-h-[44px]", BCH_BTN_PRIMARY)}
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar"}
        </Button>
      </BchFilterBar>

      {summary.multiCurrency ? (
        <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-100">
          Este período possui movimentações em mais de uma moeda. Os totais são apresentados separadamente por moeda.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <BchKpiCard label="Eventos no período" value={String(summary.events.inPeriod)} tone="gold" />
        <BchKpiCard label="Próximos (no período)" value={String(summary.events.upcoming)} tone="info" />
        <BchKpiCard label="Ingressos vendidos" value={String(summary.ticketing.ticketsSold)} tone="gold" />
        <BchKpiCard
          label="Comparecimento"
          value={String(summary.ticketing.attendance)}
          hint={summary.ticketing.attendanceRatePct ? `${summary.ticketing.attendanceRatePct}%` : undefined}
          tone="success"
        />
        <BchKpiCard label="Pedidos confirmados" value={String(summary.ticketing.confirmedOrderCount)} />
        <BchKpiCard label="Cortesias" value={String(summary.ticketing.complimentaryCount)} />
        <BchKpiCard label="Vendas bar (POS)" value={String(summary.bar.completedSalesCount)} tone="gold" />
        <BchKpiCard label="Críticos abertos" value={String(summary.alertSummary.openCritical)} tone="danger" />
        <BchKpiCard label="Avisos abertos" value={String(summary.alertSummary.openWarning)} tone="warning" />
        <BchKpiCard label="Reconhecidos" value={String(summary.alertSummary.acknowledgedUnresolved)} tone="info" />
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="min-h-[44px]" asChild>
          <Link href={`${BCH}/alerts`}>Central de alertas</Link>
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Receita e cobrança por moeda</h2>
        <CurrencyBlocks groups={summary.currencies} />
      </section>

      {mixCharts.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {mixCharts.map(({ currency, data }) => (
            <Card key={currency}>
              <CardHeader>
                <CardTitle className="text-base">Mix de receita — {currency}</CardTitle>
              </CardHeader>
              <CardContent className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="name" tick={{ fill: "currentColor", fontSize: 11 }} />
                    <YAxis tick={{ fill: "currentColor", fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      {[...trendByCurrency.entries()].map(([currency, data]) =>
        data.length > 1 ? (
          <Card key={currency}>
            <CardHeader>
              <CardTitle className="text-base">Tendência — {currency}</CardTitle>
            </CardHeader>
            <CardContent className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fill: "currentColor", fontSize: 11 }} />
                  <YAxis tick={{ fill: "currentColor", fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Receita" stroke="#a78bfa" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="attendance" name="Público" stroke="#34d399" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : null,
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Desempenho por evento</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ingressos</TableHead>
                <TableHead>Resultado</TableHead>
                <TableHead>Atenção</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.items.map((row) => {
                const primary = row.multiCurrency
                  ? null
                  : row.currencies[0] ?? null;
                return (
                  <TableRow key={row.eventId}>
                    <TableCell>
                      <div className="font-medium">{row.eventName}</div>
                      <div className="text-xs text-muted-foreground">
                        {EVENT_STATUS_LABEL[row.eventStatus] ?? row.eventStatus}
                        {row.spaceName ? ` · ${row.spaceName}` : ""}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {row.eventStartAt
                        ? new Date(row.eventStartAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.ticketsSold} vendidos · {row.attendance} presentes
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.multiCurrency ? (
                        <span className="text-muted-foreground">Multi-moeda</span>
                      ) : primary ? (
                        money(primary.currency, primary.operationalResult)
                      ) : (
                        "—"
                      )}
                      {!row.resultComplete ? (
                        <span className="ml-1 text-xs text-amber-400">incompleto</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <AlertPills alerts={row.activeAlerts ?? row.attentionFlags.map((f) => ({ alertType: f, title: f }))} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`${BCH}/eventos/${row.eventId}/financeiro`}>Financeiro</Link>
                        </Button>
                        {row.bookingId ? (
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`${BCH}/operacao/${row.bookingId}`}>Operação</Link>
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`${BCH}/ticketing?eventId=${encodeURIComponent(row.eventId)}`}>Ingressos</Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      {summary.attentionRequired.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Requer atenção</h2>
          <ul className="space-y-2">
            {summary.attentionRequired.map((a) => (
              <li
                key={a.eventId}
                className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <Link href={`${BCH}/eventos/${a.eventId}/financeiro`} className="font-medium hover:underline">
                    {a.eventName}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {a.eventStartAt
                      ? new Date(a.eventStartAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
                      : "Sem data"}
                  </p>
                </div>
                <AlertPills alerts={a.alerts.map((al: BchOperationalAlert) => ({ alertType: al.alertType, title: al.title }))} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximos eventos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.upcomingEvents.map((e) => (
              <div key={e.eventId} className="flex flex-col gap-1 border-b border-border/60 pb-2 last:border-0">
                <Link href={`${BCH}/eventos/${e.eventId}/financeiro`} className="font-medium hover:underline">
                  {e.eventName}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {e.eventStartAt
                    ? new Date(e.eventStartAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
                    : "—"}
                  {e.spaceName ? ` · ${e.spaceName}` : ""}
                </p>
                <AlertPills alerts={e.attentionFlags.map((f) => ({ alertType: f, title: f }))} />
              </div>
            ))}
            {!summary.upcomingEvents.length ? (
              <p className="text-sm text-muted-foreground">Nenhum evento futuro.</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Eventos recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.recentEvents.map((e) => (
              <div key={e.eventId} className="flex flex-col gap-1 border-b border-border/60 pb-2 last:border-0">
                <Link href={`${BCH}/eventos/${e.eventId}/financeiro`} className="font-medium hover:underline">
                  {e.eventName}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {e.attendance} presentes · {e.ticketsSold} ingressos
                </p>
                {e.multiCurrency ? (
                  <p className="text-xs text-muted-foreground">Receita em várias moedas</p>
                ) : e.currencies[0] ? (
                  <p className="text-sm">{money(e.currencies[0].currency, e.currencies[0].operationalResult)}</p>
                ) : null}
                {!e.resultComplete ? (
                  <span className={cn("text-xs text-amber-400")}>Fechamento incompleto</span>
                ) : null}
              </div>
            ))}
            {!summary.recentEvents.length ? (
              <p className="text-sm text-muted-foreground">Nenhum evento passado.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {events.comparisonByCurrency.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Comparativo no período (mesma moeda)</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {events.comparisonByCurrency.map((c) => (
              <Card key={c.currency}>
                <CardHeader>
                  <CardTitle className="text-base">{c.currency}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Top receita</p>
                  <ul className="space-y-1">
                    {c.topByRevenue.map((t) => (
                      <li key={t.eventId} className="flex justify-between gap-2">
                        <span className="truncate">{t.eventName}</span>
                        <span>{formatCatalogMoney(t.grossOperationalRevenue)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide pt-2">Top público</p>
                  <ul className="space-y-1">
                    {c.topByAttendance.map((t) => (
                      <li key={t.eventId} className="flex justify-between gap-2">
                        <span className="truncate">{t.eventName}</span>
                        <span>{t.attendance}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
