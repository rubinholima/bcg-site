"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Dashboard = {
  salesCount: number;
  revenue: string;
  estimatedCogs: string;
  estimatedGrossMargin: string;
  estimatedGrossMarginPct: string | null;
  itemsSold: string;
  lowStockProducts: number;
  outOfStockProducts: number;
  openContainers: number;
  activeEventInventories: number;
  recentDivergenceProducts: number;
  marginIncomplete: boolean;
};

export function BostonCityHallBarDashboard() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const { data: d } = await api.get<Dashboard>("/boston-city-hall/bar/reports/dashboard");
        setData(d);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/eventos/boston-city-hall/bar"
        className="inline-flex min-h-[44px] items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao bar
      </Link>
      {data?.marginIncomplete ? (
        <p className="text-sm text-amber-400">Margem parcial: faltam snapshots de custo em vendas antigas.</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vendas (30 dias)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data?.salesCount ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">R$ {data?.revenue ?? "0.00"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Margem bruta est.</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            R$ {data?.estimatedGrossMargin ?? "0.00"}
            {data?.estimatedGrossMarginPct ? ` (${data.estimatedGrossMarginPct}%)` : ""}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Itens vendidos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data?.itemsSold ?? "0"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estoque baixo / zerado</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {data?.lowStockProducts ?? 0} / {data?.outOfStockProducts ?? 0}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Eventos ativos / abertas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {data?.activeEventInventories ?? 0} · {data?.openContainers ?? 0} garrafas
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
