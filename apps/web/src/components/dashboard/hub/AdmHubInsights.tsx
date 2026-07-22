"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  DollarSign,
  Loader2,
  Package,
  ShoppingCart,
  Warehouse,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { labelForInventoryKind } from "@/lib/inventory-kinds";
import { HubStatCard } from "./HubStatCard";

interface ProductRow {
  inventoryKind?: string | null;
  currentStock?: number | null;
  stockMin?: number | null;
}

interface LancamentoRow {
  type?: string | null;
  status?: string | null;
}

const TYPE_COLORS = ["#34d399", "#60a5fa", "#fbbf24", "#a78bfa", "#f472b6"];

export function AdmHubInsights() {
  const { canAccessModule } = useAuth();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [employeesCount, setEmployeesCount] = useState(0);
  const [assetsCount, setAssetsCount] = useState(0);
  const [lancamentos, setLancamentos] = useState<LancamentoRow[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);

  const canEstoque = canAccessModule("adm_estoque") || canAccessModule("adm_compras");
  const canRh = canAccessModule("adm_rh");
  const canPatrimonio = canAccessModule("adm_patrimonio");
  const canFinanceiro = canAccessModule("adm_financeiro");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const tasks: Promise<void>[] = [];

    if (canEstoque) {
      tasks.push(
        api
          .get<ProductRow[]>("/compras/products")
          .then(({ data }) => {
            if (cancelled) return;
            const rows = Array.isArray(data) ? data : [];
            setProducts(rows);
            setLowStockCount(
              rows.filter((p) => {
                const current = p.currentStock ?? 0;
                const min = p.stockMin ?? 0;
                return min > 0 && current <= min;
              }).length,
            );
          })
          .catch(() => {
            if (!cancelled) {
              setProducts([]);
              setLowStockCount(0);
            }
          }),
      );
    }

    if (canRh) {
      tasks.push(
        api
          .get<unknown[]>("/rh/employees")
          .then(({ data }) => {
            if (!cancelled) setEmployeesCount(Array.isArray(data) ? data.length : 0);
          })
          .catch(() => {
            if (!cancelled) setEmployeesCount(0);
          }),
      );
    }

    if (canPatrimonio) {
      tasks.push(
        api
          .get<unknown[]>("/patrimonio/assets")
          .then(({ data }) => {
            if (!cancelled) setAssetsCount(Array.isArray(data) ? data.length : 0);
          })
          .catch(() => {
            if (!cancelled) setAssetsCount(0);
          }),
      );
    }

    if (canFinanceiro) {
      tasks.push(
        api
          .get<LancamentoRow[]>("/financeiro/lancamentos")
          .then(({ data }) => {
            if (!cancelled) setLancamentos(Array.isArray(data) ? data : []);
          })
          .catch(() => {
            if (!cancelled) setLancamentos([]);
          }),
      );
    }

    Promise.all(tasks).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [canEstoque, canRh, canPatrimonio, canFinanceiro]);

  const chartInventory = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of products) {
      const key = p.inventoryKind ?? "other";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([kind, total], index) => ({
        kind,
        label: labelForInventoryKind(kind),
        total,
        fill: TYPE_COLORS[index % TYPE_COLORS.length],
      }))
      .sort((a, b) => b.total - a.total);
  }, [products]);

  const chartFinance = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of lancamentos) {
      const key = l.type ?? "outros";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return Object.entries(counts).map(([type, total], index) => ({
      type,
      label: type.charAt(0).toUpperCase() + type.slice(1),
      total,
      fill: TYPE_COLORS[index % TYPE_COLORS.length],
    }));
  }, [lancamentos]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasAny =
    products.length > 0 || employeesCount > 0 || assetsCount > 0 || lancamentos.length > 0;

  if (!hasAny && !canEstoque && !canRh && !canPatrimonio && !canFinanceiro) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Indicadores</h2>
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {canEstoque ? (
            <>
              <HubStatCard
                label="Produtos"
                value={products.length}
                hint="Itens no estoque"
                icon={Package}
                href="/dashboard/adm/estoque"
                accent="from-sky-500/10 to-sky-600/5 border-sky-500/20"
                iconClass="text-sky-600 dark:text-sky-400"
              />
              <HubStatCard
                label="Estoque baixo"
                value={lowStockCount}
                hint="Abaixo do mínimo"
                icon={AlertTriangle}
                href="/dashboard/adm/estoque"
                accent="from-amber-500/10 to-amber-600/5 border-amber-500/20"
                iconClass="text-amber-600 dark:text-amber-400"
              />
            </>
          ) : null}
          {canRh ? (
            <HubStatCard
              label="Funcionários"
              value={employeesCount}
              hint="Cadastro de RH"
              icon={Briefcase}
              href="/dashboard/adm/rh"
              accent="from-violet-500/10 to-violet-600/5 border-violet-500/20"
              iconClass="text-violet-600 dark:text-violet-400"
            />
          ) : null}
          {canPatrimonio ? (
            <HubStatCard
              label="Patrimônio"
              value={assetsCount}
              hint="Bens e ativos"
              icon={Warehouse}
              href="/dashboard/adm/patrimonio"
              accent="from-emerald-500/10 to-emerald-600/5 border-emerald-500/20"
              iconClass="text-emerald-600 dark:text-emerald-400"
            />
          ) : null}
          {canFinanceiro ? (
            <HubStatCard
              label="Lançamentos"
              value={lancamentos.length}
              hint="Financeiro interno"
              icon={DollarSign}
              href="/dashboard/adm/financeiro"
              accent="from-rose-500/10 to-rose-600/5 border-rose-500/20"
              iconClass="text-rose-600 dark:text-rose-400"
            />
          ) : null}
          {canAccessModule("adm_compras") ? (
            <HubStatCard
              label="Compras"
              value={products.length}
              hint="Catálogo de produtos"
              icon={ShoppingCart}
              href="/dashboard/adm/compras"
              accent="from-indigo-500/10 to-indigo-600/5 border-indigo-500/20"
              iconClass="text-indigo-600 dark:text-indigo-400"
            />
          ) : null}
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
        {canEstoque && chartInventory.length > 0 ? (
          <Card className="min-w-0 rounded-xl shadow-md">
            <CardHeader>
              <CardTitle className="text-base">Produtos por tipo</CardTitle>
              <CardDescription>Distribuição do estoque cadastrado</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartInventory} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={52}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="total" name="Itens" radius={[6, 6, 0, 0]}>
                    {chartInventory.map((entry) => (
                      <Cell key={entry.kind} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : null}

        {canFinanceiro && chartFinance.length > 0 ? (
          <Card className="min-w-0 rounded-xl shadow-md">
            <CardHeader>
              <CardTitle className="text-base">Lançamentos por tipo</CardTitle>
              <CardDescription>Visão do módulo financeiro</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartFinance} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="total" name="Lançamentos" radius={[6, 6, 0, 0]}>
                    {chartFinance.map((entry) => (
                      <Cell key={entry.type} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <p className="text-right text-xs text-muted-foreground">
        <Link
          href="/dashboard/adm/estoque"
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          Gerenciar departamento ADM
          <ArrowRight className="h-3 w-3" />
        </Link>
      </p>
    </div>
  );
}
