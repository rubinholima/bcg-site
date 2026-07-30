"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PhysioReportPrintToolbar } from "@/components/dashboard/fisioterapia/PhysioReportPrintToolbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { PhysioReportFilters } from "@/components/dashboard/fisioterapia/PhysioReportFilters";
import type { PhysioReportsDashboard } from "@/types/fisioterapia";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { useFixtureCategories } from "@/hooks/useFixtureCategories";

const STATUS_LABEL: Record<string, string> = {
  active: "Em tratamento",
  completed: "Alta",
  cancelled: "Cancelado",
};

const CHART_COLORS = ["#f59e0b", "#6366f1", "#22c55e", "#ef4444", "#06b6d4", "#a855f7"];

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

export default function FisioterapiaAtendimentosReportPage() {
  const router = useRouter();
  const { canAccessModule, loading: authLoading } = useAuth();
  const { categories: allCats } = useFixtureCategories();
  const [tenantId, setTenantId] = useState("");
  const [category, setCategory] = useState("");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<PhysioReportsDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tenantId) params.set("tenantId", tenantId);
      if (category) params.set("category", category);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const { data: res } = await api.get<PhysioReportsDashboard>(`/fisioterapia/reports/dashboard?${params}`);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId, category, from, to]);

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessModule("saude")) {
      router.replace("/403");
      return;
    }
    void load();
  }, [authLoading, canAccessModule, load, router]);

  const chartCategory = useMemo(
    () =>
      (data?.byCategory ?? []).map((r) => ({
        name: getCategoryLabel(r.category, "pt", allCats) || r.category,
        Individual: r.individual,
        Recovery: r.group,
        Ativos: r.active,
      })),
    [data?.byCategory, allCats],
  );

  const chartMonth = useMemo(
    () =>
      (data?.byMonth ?? []).map((r) => ({
        name: monthLabel(r.month),
        Individual: r.individual,
        Recovery: r.group,
      })),
    [data?.byMonth],
  );

  const chartRegion = useMemo(
    () => (data?.byRegion ?? []).slice(0, 10).map((r) => ({ name: r.regionName, count: r.count })),
    [data?.byRegion],
  );

  const chartTreatment = useMemo(
    () => (data?.byTreatment ?? []).slice(0, 8).map((r) => ({ name: r.label, count: r.count })),
    [data?.byTreatment],
  );

  if (authLoading || !canAccessModule("saude")) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const s = data?.summary;

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/dashboard/saude/fisioterapia" className="mb-2 inline-block text-sm text-muted-foreground hover:text-foreground">
            ← Atendimentos
          </Link>
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
            <BarChart3 className="h-8 w-8" />
            Atendimentos e gráficos
          </h1>
        </div>
        <PhysioReportPrintToolbar
          kind="atendimentos"
          tenantId={tenantId}
          category={category}
          from={from}
          to={to}
          data={data}
          previewTitle="Pré-visualização — Atendimentos"
        />
      </div>

      <div className="print:hidden">
        <PhysioReportFilters
          tenantId={tenantId}
          category={category}
          from={from}
          to={to}
          onTenantChange={setTenantId}
          onCategoryChange={setCategory}
          onFromChange={setFrom}
          onToChange={setTo}
          onApply={() => void load()}
          loading={loading}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <p className="py-12 text-center text-muted-foreground">Não foi possível carregar os dados.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Atendimentos individuais", value: s?.totalIndividual ?? 0 },
              { label: "Recovery em grupo", value: s?.totalGroup ?? 0 },
              { label: "Em tratamento (ativos)", value: s?.activeSessions ?? 0 },
              { label: "Atletas atendidos", value: s?.uniquePlayers ?? 0 },
            ].map((item) => (
              <Card key={item.label}>
                <CardContent className="pt-4">
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">{s?.completedSessions ?? 0}</p>
                <p className="text-sm text-muted-foreground">Altas no período</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">{s?.avgPainScore != null ? `${s.avgPainScore}/10` : "—"}</p>
                <p className="text-sm text-muted-foreground">Dor média (EVA)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-2xl font-bold">{s?.avgReturnDays != null ? `${s.avgReturnDays} dias` : "—"}</p>
                <p className="text-sm text-muted-foreground">Tempo médio até alta</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Por categoria</CardTitle>
                <CardDescription>Individual vs recovery em grupo</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {chartCategory.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Sem dados no filtro.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartCategory} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Legend />
                      <Bar dataKey="Individual" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Recovery" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Evolução mensal</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {chartMonth.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Sem dados no filtro.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartMonth} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Legend />
                      <Bar dataKey="Individual" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Recovery" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top regiões corporais</CardTitle>
                <CardDescription>Incidência de locais de dor</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {chartRegion.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Sem dados.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartRegion} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Bar dataKey="count" fill={CHART_COLORS[2]} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tratamentos mais usados</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {chartTreatment.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Sem dados.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartTreatment} layout="vertical" margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Bar dataKey="count" fill={CHART_COLORS[3]} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Por categoria — tabela</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Individual</TableHead>
                    <TableHead className="text-right">Recovery</TableHead>
                    <TableHead className="text-right">Ativos</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byCategory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">Sem registros</TableCell>
                    </TableRow>
                  ) : (
                    data.byCategory.map((r) => (
                      <TableRow key={r.category}>
                        <TableCell>{getCategoryLabel(r.category, "pt", allCats) || r.category}</TableCell>
                        <TableCell className="text-right">{r.individual}</TableCell>
                        <TableCell className="text-right">{r.group}</TableCell>
                        <TableCell className="text-right">{r.active}</TableCell>
                        <TableCell className="text-right font-semibold">{r.total}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Por status (individual)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {data.byStatus.map((r) => (
                  <div key={r.status} className="rounded-lg border border-border/70 px-4 py-2">
                    <p className="text-lg font-bold">{r.count}</p>
                    <p className="text-sm text-muted-foreground">{STATUS_LABEL[r.status] ?? r.status}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {data.byDiagnosis.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top diagnósticos</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {data.byDiagnosis.map((d) => (
                    <li key={d.label} className="flex justify-between gap-2 border-b border-border/40 py-1">
                      <span>{d.label}</span>
                      <span className="font-semibold">{d.count}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
