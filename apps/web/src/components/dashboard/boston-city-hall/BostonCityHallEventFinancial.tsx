"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { BchEventFinancialResult } from "@/types/boston-city-hall";
import { formatCatalogMoney, EVENT_STATUS_LABEL } from "@/types/boston-city-hall";
import { cn } from "@/lib/utils";

function moneyOrDash(amount: string | null, currency: string | null, applicable: boolean): string {
  if (!applicable) return "—";
  if (amount == null) return "—";
  return currency ? `${currency} ${amount}` : formatCatalogMoney(amount);
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
}: {
  eventId: string;
  backHref: string;
  backLabel: string;
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
      <Link
        href={backHref}
        className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </Link>

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

      <div className="flex flex-wrap gap-2">
        <CompletenessPill ok={data.completeness.ticketingConfigured} label="Ingressos" />
        <CompletenessPill ok={data.completeness.barCloseFinalized} label="Fechamento bar" />
        <CompletenessPill ok={data.completeness.barCostComplete} label="Custos bar" />
        <CompletenessPill ok={data.completeness.receivableLinked} label="Recebível" />
        <CompletenessPill ok={data.completeness.resultComplete} label="Resultado" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita operacional</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatCatalogMoney(data.revenue.grossOperationalRevenue)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resultado operacional</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatCatalogMoney(data.result.operationalResult)}
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
            {formatCatalogMoney(data.collection.totalCollected)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em aberto</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatCatalogMoney(data.collection.totalOutstanding)}
          </CardContent>
        </Card>
      </div>

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
            <p className="font-medium">{formatCatalogMoney(data.cost.totalKnownOperationalCost)}</p>
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
