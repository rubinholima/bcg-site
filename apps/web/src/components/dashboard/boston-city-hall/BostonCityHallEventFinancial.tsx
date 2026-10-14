"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { BchEventFinancialCurrencyGroup, BchEventFinancialResult } from "@/types/boston-city-hall";
import { formatCatalogMoney, EVENT_STATUS_LABEL } from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";
import { BostonCityHallEventAlertsBanner } from "@/components/dashboard/boston-city-hall/BostonCityHallEventAlertsBanner";

function moneyOrDash(amount: string | null, currency: string | null, applicable: boolean): string {
  if (!applicable) return "—";
  if (amount == null) return "—";
  return currency ? `${currency} ${amount}` : formatCatalogMoney(amount);
}

function withCurrency(amount: string | null, currency: string | null): string {
  if (amount == null) return "—";
  return currency ? `${currency} ${amount}` : formatCatalogMoney(amount);
}

function CurrencyGroupCards({ group }: { group: BchEventFinancialCurrencyGroup }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{group.currency}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
        <div>
          <p className="text-muted-foreground">Receita operacional</p>
          <p className="font-medium">{withCurrency(group.grossOperationalRevenue, group.currency)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ingressos: {withCurrency(group.ticketingRevenue, group.currency)} · Bar:{" "}
            {withCurrency(group.barRevenue, group.currency)} · Venue:{" "}
            {withCurrency(group.venueRevenue, group.currency)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Recebido / em aberto</p>
          <p>{withCurrency(group.collected, group.currency)}</p>
          <p className="text-muted-foreground">
            Aberto: {withCurrency(group.outstanding, group.currency)}
            {group.overdue != null ? ` · Vencido: ${withCurrency(group.overdue, group.currency)}` : ""}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Custo / resultado</p>
          <p>Custo: {withCurrency(group.knownOperationalCost, group.currency)}</p>
          <p className="font-medium">
            {withCurrency(group.operationalResult, group.currency)}
            {group.operationalMarginPct ? (
              <span className="ml-1 text-muted-foreground font-normal">({group.operationalMarginPct}%)</span>
            ) : null}
          </p>
          {group.marginIncomplete ? (
            <p className="text-xs text-amber-400 mt-1">Margem incompleta nesta moeda.</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function CompletenessPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs ring-1 ring-inset",
        ok ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30" : "bg-zinc-500/15 text-zinc-300 ring-zinc-500/25",
      )}
    >
      {label}
    </span>
  );
}

export function BostonCityHallEventFinancial({
  eventId,
  backHref,
  backLabel,
  embedded,
}: {
  eventId: string;
  backHref: string;
  backLabel: string;
  embedded?: boolean;
}) {
  const [data, setData] = useState<BchEventFinancialResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: d } = await api.get<BchEventFinancialResult>(
        `/boston-city-hall/events/${encodeURIComponent(eventId)}/financial-result`,
      );
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar resultado financeiro.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 py-8">
          <p className="text-sm text-red-300">{error ?? "Dados indisponíveis."}</p>
          <Button type="button" variant="outline" className="min-h-[44px]" onClick={() => void load()}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {!embedded ? (
        <Link
          href={backHref}
          className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      ) : null}
      {!embedded ? <BostonCityHallEventAlertsBanner eventId={eventId} lazy /> : null}

      <div>
        <h2 className="text-lg font-semibold text-foreground">{data.eventName}</h2>
        <p className="text-sm text-muted-foreground">
          {EVENT_STATUS_LABEL[data.eventStatus] ?? data.eventStatus}
          {data.eventStartAt
            ? ` · ${new Date(data.eventStartAt).toLocaleDateString("pt-BR")}`
            : ""}
        </p>
      </div>

      {data.result.marginIncomplete ? (
        <p className="text-sm text-amber-400">Margem operacional incompleta — faltam custos canônicos do bar.</p>
      ) : null}

      {data.multiCurrency ? (
        <p className="text-sm text-sky-200/90">
          Este evento possui movimentações em mais de uma moeda. Os totais são apresentados separadamente por moeda.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <CompletenessPill ok={data.completeness.ticketingConfigured} label="Ingressos" />
        <CompletenessPill ok={data.completeness.barCloseFinalized} label="Fechamento bar" />
        <CompletenessPill ok={data.completeness.barCostComplete} label="Custos bar" />
        <CompletenessPill ok={data.completeness.receivableLinked} label="Recebível" />
        <CompletenessPill ok={data.completeness.resultComplete} label="Resultado" />
      </div>

      {data.multiCurrency ? (
        <div className="space-y-3">
          {data.currencies.map((g) => (
            <CurrencyGroupCards key={g.currency} group={g} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Receita operacional</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">
              {withCurrency(data.revenue.grossOperationalRevenue, data.consolidatedCurrency)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Resultado operacional</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">
              {withCurrency(data.result.operationalResult, data.consolidatedCurrency)}
              {data.result.operationalMarginPct ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({data.result.operationalMarginPct}%)
                </span>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Recebido</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">
              {withCurrency(data.collection.totalCollected, data.consolidatedCurrency)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Em aberto</CardTitle>
            </CardHeader>
            <CardContent className="text-xl font-semibold">
              {withCurrency(data.collection.totalOutstanding, data.consolidatedCurrency)}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Receita</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
          <div>
            <p className="text-muted-foreground">Ingressos</p>
            <p className="font-medium">
              {moneyOrDash(data.revenue.ticketing.amount, data.revenue.ticketing.currency, data.revenue.ticketing.applicable)}
            </p>
            <p className="text-xs text-muted-foreground">
              {data.revenue.ticketing.confirmedOrderCount} pedidos · {data.revenue.ticketing.ticketsSold} ingressos
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Bar</p>
            <p className="font-medium">
              {moneyOrDash(data.revenue.bar.amount, data.revenue.bar.currency, data.revenue.bar.applicable)}
            </p>
            <p className="text-xs text-muted-foreground">{data.revenue.bar.salesCount} vendas concluídas</p>
          </div>
          <div>
            <p className="text-muted-foreground">Contrato / venue</p>
            <p className="font-medium">
              {moneyOrDash(
                data.revenue.venueContract.amount,
                data.revenue.venueContract.currency,
                data.revenue.venueContract.applicable,
              )}
            </p>
            {data.revenue.venueContract.notes ? (
              <p className="text-xs text-muted-foreground">{data.revenue.venueContract.notes}</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Custos conhecidos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-muted-foreground">COGS bar (estimado)</p>
            <p>{data.cost.barCogs ? formatCatalogMoney(data.cost.barCogs) : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total custo operacional</p>
            <p className="font-medium">
              {withCurrency(data.cost.totalKnownOperationalCost, data.consolidatedCurrency)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>KPIs operacionais</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 grid-cols-2 sm:grid-cols-4 text-sm">
          <div>
            <p className="text-muted-foreground">Presença</p>
            <p className="font-medium">{data.operationalKpis.attendance}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Cortesias</p>
            <p className="font-medium">{data.operationalKpis.complimentaryCount}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Divergência inventário</p>
            <p className="font-medium">{data.revenue.bar.physicalDivergenceProducts} prod.</p>
          </div>
          <div>
            <p className="text-muted-foreground">Projeções Financeiro</p>
            <p className="font-medium">{data.financeiro.projectionCount}</p>
            <p className="text-xs text-muted-foreground">{data.financeiro.note}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
