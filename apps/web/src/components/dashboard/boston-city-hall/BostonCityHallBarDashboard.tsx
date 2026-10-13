"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { BchKpiCard } from "@/components/dashboard/boston-city-hall/BchKpiCard";
import { BchLoadingBlock } from "@/components/dashboard/boston-city-hall/BchLoadingBlock";

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
    return <BchLoadingBlock label="Carregando indicadores do bar…" />;
  }

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/eventos/boston-city-hall/bar"
        className="inline-flex min-h-[44px] items-center gap-1 text-sm text-slate-400 hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao bar
      </Link>
      {data?.marginIncomplete ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Margem parcial: faltam snapshots de custo em vendas antigas.
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <BchKpiCard label="Vendas (30 dias)" value={data?.salesCount ?? 0} tone="gold" />
        <BchKpiCard label="Receita" value={`R$ ${data?.revenue ?? "0.00"}`} tone="gold" />
        <BchKpiCard
          label="Margem bruta est."
          value={`R$ ${data?.estimatedGrossMargin ?? "0.00"}`}
          hint={data?.estimatedGrossMarginPct ? `${data.estimatedGrossMarginPct}%` : undefined}
          tone="success"
        />
        <BchKpiCard label="Itens vendidos" value={data?.itemsSold ?? "0"} />
        <BchKpiCard
          label="Estoque baixo / zerado"
          value={`${data?.lowStockProducts ?? 0} / ${data?.outOfStockProducts ?? 0}`}
          tone="warning"
        />
        <BchKpiCard
          label="Inventários ativos / garrafas abertas"
          value={`${data?.activeEventInventories ?? 0} · ${data?.openContainers ?? 0}`}
          tone="info"
        />
      </div>
    </div>
  );
}
