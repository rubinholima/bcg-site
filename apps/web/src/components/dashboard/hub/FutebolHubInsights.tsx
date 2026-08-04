"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Loader2,
  Map,
  Shirt,
  Users,
  ArrowRight,
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
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { agendaHubUrl, AGENDA_VISAO } from "@/lib/agenda-hub";
import { useAuth } from "@/context/AuthContext";
import { HubStatCard } from "./HubStatCard";
import { getCategoryLabel } from "@/lib/fixture-categories";
import { formatDateDayMonYear } from "@/lib/format-date";

interface TravelLogisticsItem {
  id: string;
  matchDate: string;
  opponentName?: string | null;
  stadiumName?: string | null;
  city?: string | null;
  championshipName?: string | null;
  status: string;
  tenant?: { name?: string };
  category?: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  planejamento: "Planejamento",
  aprovado: "Aprovado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  rascunho: "#94a3b8",
  planejamento: "#60a5fa",
  aprovado: "#34d399",
  em_andamento: "#fbbf24",
  concluido: "#22c55e",
  cancelado: "#f87171",
};

function formatDate(d: string): string {
  return formatDateDayMonYear(d);
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function FutebolHubInsights() {
  const { canAccessModule } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logistica, setLogistica] = useState<TravelLogisticsItem[]>([]);
  const [playersCount, setPlayersCount] = useState(0);
  const [staffCount, setStaffCount] = useState(0);

  const canLogistica = canAccessModule("futebol_logistica");
  const canComissao = canAccessModule("futebol_comissao");
  const canPlayers = canAccessModule("tipos");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const tasks: Promise<void>[] = [];

    if (canLogistica) {
      tasks.push(
        api
          .get<TravelLogisticsItem[]>("/logistica")
          .then(({ data }) => {
            if (!cancelled) setLogistica(data ?? []);
          })
          .catch(() => {
            if (!cancelled) setLogistica([]);
          }),
      );
    }

    if (canPlayers) {
      tasks.push(
        api
          .get<unknown[]>("/players")
          .then(({ data }) => {
            if (!cancelled) setPlayersCount(Array.isArray(data) ? data.length : 0);
          })
          .catch(() => {
            if (!cancelled) setPlayersCount(0);
          }),
      );
    }

    if (canComissao) {
      tasks.push(
        api
          .get<unknown[]>("/technical-staff")
          .then(({ data }) => {
            if (!cancelled) setStaffCount(Array.isArray(data) ? data.length : 0);
          })
          .catch(() => {
            if (!cancelled) setStaffCount(0);
          }),
      );
    }

    Promise.all(tasks).finally(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [canLogistica, canComissao, canPlayers]);

  const { today, in30Days } = useMemo(() => {
    const t = startOfDay(new Date());
    const end = new Date(t);
    end.setDate(end.getDate() + 30);
    return { today: t, in30Days: end };
  }, []);

  const upcoming = useMemo(() => {
    return logistica
      .filter((item) => {
        const d = startOfDay(new Date(item.matchDate));
        return d >= today && d <= in30Days && item.status !== "cancelado";
      })
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime())
      .slice(0, 6);
  }, [logistica, today, in30Days]);

  const chartStatus = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of logistica) {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
    }
    return Object.entries(counts).map(([status, total]) => ({
      status,
      label: STATUS_LABELS[status] ?? status,
      total,
      fill: STATUS_COLORS[status] ?? "#64748b",
    }));
  }, [logistica]);

  const upcomingCount = useMemo(
    () =>
      logistica.filter((item) => {
        const d = startOfDay(new Date(item.matchDate));
        return d >= today && d <= in30Days && item.status !== "cancelado";
      }).length,
    [logistica, today, in30Days],
  );

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasAnyData =
    logistica.length > 0 || playersCount > 0 || staffCount > 0;

  if (!hasAnyData && !canLogistica && !canPlayers && !canComissao) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Indicadores</h2>
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {canLogistica ? (
            <>
              <HubStatCard
                label="Próximos 30 dias"
                value={upcomingCount}
                hint="Viagens e jogos no calendário"
                icon={Calendar}
                href={agendaHubUrl(AGENDA_VISAO.FUTEBOL)}
                accent="from-sky-500/10 to-sky-600/5 border-sky-500/20"
                iconClass="text-sky-600 dark:text-sky-400"
              />
              <HubStatCard
                label="Logística"
                value={logistica.length}
                hint="Registros no departamento"
                icon={Map}
                href="/dashboard/futebol/logistica"
                accent="from-amber-500/10 to-amber-600/5 border-amber-500/20"
                iconClass="text-amber-600 dark:text-amber-400"
              />
            </>
          ) : null}
          {canPlayers ? (
            <HubStatCard
              label="Atletas"
              value={playersCount}
              hint="Cadastro de jogadores"
              icon={Shirt}
              href="/dashboard/cadastros/jogadores"
              accent="from-emerald-500/10 to-emerald-600/5 border-emerald-500/20"
              iconClass="text-emerald-600 dark:text-emerald-400"
            />
          ) : null}
          {canComissao ? (
            <HubStatCard
              label="Comissão técnica"
              value={staffCount}
              hint="Profissionais cadastrados"
              icon={Users}
              href="/dashboard/futebol/comissao"
              accent="from-violet-500/10 to-violet-600/5 border-violet-500/20"
              iconClass="text-violet-600 dark:text-violet-400"
            />
          ) : null}
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
        {canLogistica ? (
          <Card className="min-w-0 rounded-xl shadow-md">
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-5 w-5 text-sky-500" />
                  Agenda — próximos compromissos
                </CardTitle>
                <CardDescription>Jogos e deslocamentos nos próximos 30 dias</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild className="shrink-0">
                <Link href={agendaHubUrl(AGENDA_VISAO.FUTEBOL)}>Ver agenda</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum compromisso nos próximos 30 dias. Cadastre viagens em Logística.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {upcoming.map((item) => (
                    <li key={item.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-sky-500/10 text-center">
                        <span className="text-[10px] font-medium uppercase text-sky-600 dark:text-sky-400">
                          {formatDateDayMonYear(item.matchDate).split(" ")[1] ?? "—"}
                        </span>
                        <span className="text-lg font-bold leading-none text-foreground">
                          {formatDateDayMonYear(item.matchDate).split(" ")[0] ?? "—"}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          {item.opponentName ? `vs ${item.opponentName}` : item.championshipName ?? "Compromisso"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[item.tenant?.name, item.stadiumName ?? item.city, item.category ? getCategoryLabel(item.category, "pt") : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(item.matchDate)} · {STATUS_LABELS[item.status] ?? item.status}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ) : null}

        {canLogistica && chartStatus.length > 0 ? (
          <Card className="min-w-0 rounded-xl shadow-md">
            <CardHeader>
              <CardTitle className="text-base">Logística por status</CardTitle>
              <CardDescription>Distribuição dos registros de viagem e jogo</CardDescription>
            </CardHeader>
            <CardContent className="h-[280px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartStatus} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={56}
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
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="total" name="Registros" radius={[6, 6, 0, 0]}>
                    {chartStatus.map((entry) => (
                      <Cell key={entry.status} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {canLogistica ? (
        <p className="text-right text-xs text-muted-foreground">
          <Link
            href="/dashboard/futebol/logistica"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            Gerenciar logística
            <ArrowRight className="h-3 w-3" />
          </Link>
        </p>
      ) : null}
    </div>
  );
}
