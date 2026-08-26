"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Ban,
  Calendar,
  ClipboardList,
  HeartPulse,
  Loader2,
  ShieldAlert,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";
import { getCategoryLabel } from "@/lib/fixture-categories";
import type { CartoesSuspensaoReportDto } from "@/lib/futebol-relatorios.types";
import type { CoachContextResponse } from "@/lib/treinadores-types";
import { HubStatCard } from "@/components/dashboard/hub/HubStatCard";
import { TREINADORES_BASE } from "./treinadores-nav";

type DisciplinePlayer = {
  playerId: string;
  name: string;
  jerseyNumber: number | null;
  category: string;
  categoryLabel: string;
  status: "P" | "S";
};

type CategoryDisciplineRow = {
  category: string;
  label: string;
  pendurados: number;
  suspensos: number;
};

interface Props {
  tenantId: string;
  category?: string;
  context: CoachContextResponse | null;
  contextLoading: boolean;
  loadError: string | null;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function summarizeReport(data: CartoesSuspensaoReportDto, category: string, categoryLabel: string) {
  const pendurados = data.players.filter((p) => p.nextRoundCell === "P");
  const suspensos = data.players.filter((p) => p.nextRoundCell === "S");
  const players: DisciplinePlayer[] = [
    ...pendurados.map((p) => ({
      playerId: p.playerId,
      name: p.name,
      jerseyNumber: p.jerseyNumber,
      category,
      categoryLabel,
      status: "P" as const,
    })),
    ...suspensos.map((p) => ({
      playerId: p.playerId,
      name: p.name,
      jerseyNumber: p.jerseyNumber,
      category,
      categoryLabel,
      status: "S" as const,
    })),
  ];
  return {
    categoryLabel: data.filters.categoryLabel || categoryLabel,
    pendurados: pendurados.length,
    suspensos: suspensos.length,
    players,
  };
}

async function fetchDisciplineForCategory(tenantId: string, cat: string) {
  const season = new Date().getFullYear();
  const params = new URLSearchParams({
    tenantId,
    category: cat,
    season: String(season),
  });
  const { data } = await api.get<CartoesSuspensaoReportDto>(
    `/futebol-relatorios/cartoes-suspensao?${params.toString()}`,
  );
  const label = data.filters.categoryLabel || getCategoryLabel(cat, "pt");
  return summarizeReport(data, cat, label);
}

export function TreinadoresHubInsights({
  tenantId,
  category,
  context,
  contextLoading,
  loadError,
}: Props) {
  const [tenantCategories, setTenantCategories] = useState<string[]>([]);
  const [disciplineLoading, setDisciplineLoading] = useState(false);
  const [categoryRows, setCategoryRows] = useState<CategoryDisciplineRow[]>([]);
  const [disciplinePlayers, setDisciplinePlayers] = useState<DisciplinePlayer[]>([]);

  useEffect(() => {
    if (!tenantId) {
      setTenantCategories([]);
      return;
    }
    let cancelled = false;
    api
      .get<Array<{ id: string; categories?: string[] | null }>>("/tenants?clubsOnly=1")
      .then(({ data }) => {
        if (cancelled) return;
        const tenant = (data ?? []).find((t) => t.id === tenantId);
        const cats = Array.isArray(tenant?.categories)
          ? tenant.categories.filter((c): c is string => typeof c === "string" && !!c.trim())
          : [];
        setTenantCategories(cats);
      })
      .catch(() => {
        if (!cancelled) setTenantCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const categoriesToFetch = useMemo(() => {
    if (category) return [category];
    if (tenantCategories.length > 0) return tenantCategories;
    const fromContext = new Set<string>();
    for (const p of context?.players ?? []) {
      if (p.category?.trim()) fromContext.add(p.category.trim());
    }
    for (const g of context?.upcomingGames ?? []) {
      if (g.category?.trim()) fromContext.add(g.category.trim());
    }
    return [...fromContext];
  }, [category, tenantCategories, context]);

  useEffect(() => {
    if (!tenantId || categoriesToFetch.length === 0) {
      setCategoryRows([]);
      setDisciplinePlayers([]);
      setDisciplineLoading(false);
      return;
    }

    let cancelled = false;
    setDisciplineLoading(true);

    Promise.allSettled(categoriesToFetch.map((cat) => fetchDisciplineForCategory(tenantId, cat)))
      .then((results) => {
        if (cancelled) return;
        const rows: CategoryDisciplineRow[] = [];
        const players: DisciplinePlayer[] = [];

        results.forEach((result, index) => {
          const cat = categoriesToFetch[index]!;
          if (result.status !== "fulfilled") return;
          const summary = result.value;
          rows.push({
            category: cat,
            label: summary.categoryLabel,
            pendurados: summary.pendurados,
            suspensos: summary.suspensos,
          });
          players.push(...summary.players);
        });

        players.sort((a, b) => {
          if (a.status !== b.status) return a.status === "S" ? -1 : 1;
          return a.name.localeCompare(b.name, "pt-BR");
        });

        setCategoryRows(rows.sort((a, b) => a.label.localeCompare(b.label, "pt-BR")));
        setDisciplinePlayers(players);
      })
      .finally(() => {
        if (!cancelled) setDisciplineLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantId, categoriesToFetch]);

  const { today, in30Days } = useMemo(() => {
    const t = startOfDay(new Date());
    const end = new Date(t);
    end.setDate(end.getDate() + 30);
    return { today: t, in30Days: end };
  }, []);

  const upcoming = useMemo(() => {
    return (context?.upcomingGames ?? [])
      .filter((g) => {
        const d = startOfDay(new Date(g.matchDate));
        return d >= today && d <= in30Days;
      })
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime())
      .slice(0, 6);
  }, [context, today, in30Days]);

  const resultsChart = useMemo(() => {
    const counts = { V: 0, E: 0, D: 0 };
    for (const g of context?.completedGames ?? []) {
      if (g.result) counts[g.result] += 1;
    }
    return [
      { result: "Vitórias", total: counts.V, fill: "#34d399" },
      { result: "Empates", total: counts.E, fill: "#fbbf24" },
      { result: "Derrotas", total: counts.D, fill: "#f87171" },
    ].filter((row) => row.total > 0);
  }, [context]);

  const disciplineChart = useMemo(
    () =>
      categoryRows.map((row) => ({
        label: row.label,
        Pendurados: row.pendurados,
        Suspensos: row.suspensos,
      })),
    [categoryRows],
  );

  const totalPendurados = useMemo(
    () => categoryRows.reduce((sum, row) => sum + row.pendurados, 0),
    [categoryRows],
  );
  const totalSuspensos = useMemo(
    () => categoryRows.reduce((sum, row) => sum + row.suspensos, 0),
    [categoryRows],
  );

  const qs = category ? `?tenantId=${tenantId}&category=${encodeURIComponent(category)}` : `?tenantId=${tenantId}`;
  const cartoesHref = `/dashboard/relatorios/futebol/cartoes-suspensao${qs}`;

  if (contextLoading || disciplineLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-border">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!context) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {loadError ?? "Não foi possível carregar os indicadores do clube."}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <HubStatCard
          label="Pendurados"
          value={totalPendurados}
          hint="Próximo jogo — cartão acumulado"
          icon={ShieldAlert}
          href={cartoesHref}
          accent="from-amber-500/10 to-amber-600/5 border-amber-500/20"
          iconClass="text-amber-600 dark:text-amber-400"
        />
        <HubStatCard
          label="Suspensos"
          value={totalSuspensos}
          hint="Indisponíveis por disciplina"
          icon={Ban}
          href={cartoesHref}
          accent="from-red-500/10 to-red-600/5 border-red-500/20"
          iconClass="text-red-600 dark:text-red-400"
        />
        <HubStatCard
          label="Em tratamento"
          value={context.inTreatment.length}
          hint="Fisioterapia e enfermaria"
          icon={HeartPulse}
          href={`${TREINADORES_BASE}/informacoes${qs}`}
          accent="from-rose-500/10 to-rose-600/5 border-rose-500/20"
          iconClass="text-rose-600 dark:text-rose-400"
        />
        <HubStatCard
          label="Próximos 30 dias"
          value={upcoming.length}
          hint="Jogos no calendário"
          icon={Calendar}
          href={`/dashboard/futebol/jogos${qs}`}
          accent="from-sky-500/10 to-sky-600/5 border-sky-500/20"
          iconClass="text-sky-600 dark:text-sky-400"
        />
        <HubStatCard
          label="Elenco disponível"
          value={context.availableSquad.length}
          hint="Sem tratamento ativo"
          icon={Users}
          href={`${TREINADORES_BASE}/informacoes${qs}`}
          accent="from-emerald-500/10 to-emerald-600/5 border-emerald-500/20"
          iconClass="text-emerald-600 dark:text-emerald-400"
        />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="min-w-0 rounded-xl shadow-md">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                Disciplina por categoria
              </CardTitle>
              <CardDescription>Pendurados e suspensos no próximo jogo</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild className="shrink-0">
              <Link href={cartoesHref}>Planilha completa</Link>
            </Button>
          </CardHeader>
          <CardContent className="h-[280px] min-w-0">
            {disciplineChart.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sem dados disciplinares para as categorias selecionadas.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={disciplineChart} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={52}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="Pendurados" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Suspensos" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {resultsChart.length > 0 ? (
          <Card className="min-w-0 rounded-xl shadow-md">
            <CardHeader>
              <CardTitle className="text-base">Resultados recentes</CardTitle>
              <CardDescription>Distribuição V/E/D dos jogos realizados</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={resultsChart}
                    dataKey="total"
                    nameKey="result"
                    cx="50%"
                    cy="50%"
                    outerRadius={92}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {resultsChart.map((entry) => (
                      <Cell key={entry.result} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <Card className="min-w-0 rounded-xl shadow-md">
            <CardHeader>
              <CardTitle className="text-base">Resultados recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nenhum jogo realizado na categoria selecionada.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="min-w-0 rounded-xl shadow-md">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Pendurados e suspensos
              </CardTitle>
              <CardDescription>Situação disciplinar para o próximo jogo</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {disciplinePlayers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum atleta pendurado ou suspenso.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {disciplinePlayers.map((p) => (
                  <li key={`${p.playerId}-${p.status}`} className="flex items-center gap-3 py-3 first:pt-0">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold ${
                        p.status === "S"
                          ? "bg-red-500/15 text-red-400"
                          : "bg-amber-500/15 text-amber-400"
                      }`}
                    >
                      {p.status === "S" ? "Suspenso" : "Pendurado"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {p.jerseyNumber != null ? `#${p.jerseyNumber} ` : ""}
                        {p.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{p.categoryLabel}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 rounded-xl shadow-md">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-5 w-5 text-sky-500" />
                Próximos jogos
              </CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild className="shrink-0">
              <Link href={`/dashboard/futebol/jogos${qs}`}>Ver jogos</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum jogo nos próximos 30 dias.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.map((g) => (
                  <li key={g.id} className="py-3 first:pt-0">
                    <p className="font-medium text-foreground">
                      {g.opponentName ? `vs ${g.opponentName}` : g.championshipName ?? "Jogo"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateDayMonYear(g.matchDate)}
                      {g.category ? ` · ${getCategoryLabel(g.category, "pt")}` : ""}
                      {g.championshipName ? ` · ${g.championshipName}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {context.inTreatment.length > 0 ? (
        <Card className="min-w-0 rounded-xl shadow-md">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <HeartPulse className="h-5 w-5 text-rose-500" />
                Em tratamento
              </CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild className="shrink-0">
              <Link href={`${TREINADORES_BASE}/informacoes${qs}`}>Ver elenco</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {context.inTreatment.slice(0, 8).map((t) => (
                <li key={t.playerId} className="rounded-lg border border-border/60 p-3 text-sm">
                  <p className="font-medium">
                    {t.jerseyNumber != null ? `#${t.jerseyNumber} ` : ""}
                    {t.name}
                  </p>
                  <p className="text-muted-foreground">{t.reason}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-right text-xs text-muted-foreground">
        <Link
          href={`${TREINADORES_BASE}/pos-jogo${qs}`}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          <ClipboardList className="h-3.5 w-3.5" />
          Relatório pós-jogo
        </Link>
      </p>
    </div>
  );
}
