"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { BchDestinationPageShell } from "@/components/dashboard/boston-city-hall/BchDestinationPageShell";
import { BchLoadingBlock } from "@/components/dashboard/boston-city-hall/BchLoadingBlock";
import { BchMetricsStrip } from "@/components/dashboard/boston-city-hall/BchMetricsStrip";
import { BchModuleSubNav } from "@/components/dashboard/boston-city-hall/BchModuleSubNav";
import { BCH_BAR_SUBNAV } from "@/components/dashboard/boston-city-hall/bch-subnav.config";
import { BCH_BASE } from "@/components/dashboard/boston-city-hall/bch-navigation.config";
import { BchQuickLinkGrid } from "@/components/dashboard/boston-city-hall/BchQuickLinkGrid";
import { BchSection } from "@/components/dashboard/boston-city-hall/BchSection";
import { BCH_BTN_PRIMARY } from "@/components/dashboard/boston-city-hall/bch-ui-classes";
import { BarChart3, Package, ShoppingCart, Wine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
      <BchDestinationPageShell title="Bar e estoque" subNav={<BchModuleSubNav items={BCH_BAR_SUBNAV} ariaLabel="Bar" />}>
        <BchLoadingBlock label="Carregando indicadores do bar…" />
      </BchDestinationPageShell>
    );
  }

  return (
    <BchDestinationPageShell
      title="Painel do bar"
      breadcrumbs={[
        { href: BCH_BASE, label: "Boston City Hall" },
        { label: "Bar e estoque" },
        { label: "Painel" },
      ]}
      subNav={<BchModuleSubNav items={BCH_BAR_SUBNAV} ariaLabel="Bar" />}
      actions={
        <Button asChild className={cn("min-h-[44px]", BCH_BTN_PRIMARY)}>
          <Link href={`${BCH_BASE}/bar/pos`}>Abrir POS</Link>
        </Button>
      }
    >
      {data?.marginIncomplete ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Margem parcial: faltam snapshots de custo em vendas antigas.
        </p>
      ) : null}

      <BchMetricsStrip
        title="Últimos 30 dias"
        items={[
          { label: "Vendas", value: data?.salesCount ?? 0, href: `${BCH_BASE}/bar/reports` },
          { label: "Receita", value: `R$ ${data?.revenue ?? "0,00"}` },
          {
            label: "Margem est.",
            value: `R$ ${data?.estimatedGrossMargin ?? "0,00"}`,
            title: data?.estimatedGrossMarginPct ? `${data.estimatedGrossMarginPct}%` : undefined,
          },
          { label: "Itens", value: data?.itemsSold ?? "0" },
          {
            label: "Estoque baixo / zero",
            value: `${data?.lowStockProducts ?? 0} / ${data?.outOfStockProducts ?? 0}`,
            href: `${BCH_BASE}/bar`,
          },
          {
            label: "Inv. ativos / abertas",
            value: `${data?.activeEventInventories ?? 0} · ${data?.openContainers ?? 0}`,
            href: `${BCH_BASE}/bar/event-inventory`,
          },
        ]}
        footer={
          (data?.recentDivergenceProducts ?? 0) > 0 ? (
            <p className="text-xs text-amber-200/90">
              {data!.recentDivergenceProducts} produto
              {data!.recentDivergenceProducts === 1 ? "" : "s"} com divergência recente.
            </p>
          ) : null
        }
      />

      <BchSection title="Operação do bar">
        <BchQuickLinkGrid
          columns={3}
          links={[
            { href: `${BCH_BASE}/bar/pos`, label: "POS", icon: ShoppingCart, primary: true },
            { href: `${BCH_BASE}/bar`, label: "Cadastro", icon: Wine },
            { href: `${BCH_BASE}/bar/event-inventory`, label: "Estoque de evento", icon: Package },
            { href: `${BCH_BASE}/bar/physical-counts`, label: "Contagem física", icon: Package },
            { href: `${BCH_BASE}/bar/reports`, label: "Relatórios", icon: BarChart3 },
            { href: `${BCH_BASE}/bar/close`, label: "Fechamento", icon: BarChart3 },
          ]}
        />
      </BchSection>
    </BchDestinationPageShell>
  );
}
