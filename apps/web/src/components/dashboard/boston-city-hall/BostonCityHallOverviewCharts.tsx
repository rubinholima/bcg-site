"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { VenueOverview } from "@/types/boston-city-hall";
import {
  BOOKING_STATUS_LABEL,
  LEAD_SOURCE_LABEL,
  PIPELINE_STAGE_CHART_COLOR,
  PIPELINE_STAGE_LABEL,
} from "@/types/boston-city-hall";

function formatDayLabel(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

type Props = {
  overview: VenueOverview;
};

export function BostonCityHallOverviewCharts({ overview }: Props) {
  const leadsTrend = useMemo(
    () =>
      (overview.leadsLast30Days ?? []).map((p) => ({
        ...p,
        label: formatDayLabel(p.date),
      })),
    [overview.leadsLast30Days],
  );

  const pipelineChart = useMemo(
    () =>
      Object.entries(overview.pipelineByStage ?? {})
        .filter(([, count]) => count > 0)
        .map(([stage, total]) => ({
          stage,
          label: PIPELINE_STAGE_LABEL[stage] ?? stage,
          total,
          fill: PIPELINE_STAGE_CHART_COLOR[stage] ?? "#94a3b8",
        }))
        .sort((a, b) => b.total - a.total),
    [overview.pipelineByStage],
  );

  const sourceChart = useMemo(
    () =>
      (overview.leadsBySource ?? []).map((s) => ({
        ...s,
        label: LEAD_SOURCE_LABEL[s.source] ?? s.source,
      })),
    [overview.leadsBySource],
  );

  const bookingsChart = useMemo(
    () =>
      Object.entries(overview.bookingsByStatus ?? {})
        .filter(([, count]) => count > 0)
        .map(([status, total]) => ({
          status,
          label: BOOKING_STATUS_LABEL[status] ?? status,
          total,
        })),
    [overview.bookingsByStatus],
  );

  const tooltipStyle = {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    color: "hsl(var(--foreground))",
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Gráficos</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Leads — últimos 30 dias</CardTitle>
            <CardDescription>Novos contatos por dia</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px] min-w-0">
            {leadsTrend.some((p) => p.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={leadsTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Leads"
                    stroke="#a78bfa"
                    strokeWidth={2}
                    dot={{ r: 2, fill: "#a78bfa" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sem leads no período
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pipeline por estágio</CardTitle>
            <CardDescription>Distribuição comercial atual</CardDescription>
          </CardHeader>
          <CardContent className="h-[260px] min-w-0">
            {pipelineChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineChart} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={120}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="total" name="Leads" radius={[0, 4, 4, 0]}>
                    {pipelineChart.map((entry) => (
                      <Cell key={entry.stage} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Nenhum lead no pipeline
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Origem dos leads</CardTitle>
            <CardDescription>Site vs cadastro manual</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px] min-w-0">
            {sourceChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Leads" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Sem dados de origem
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Reservas por status</CardTitle>
            <CardDescription>Todas as reservas cadastradas</CardDescription>
          </CardHeader>
          <CardContent className="h-[220px] min-w-0">
            {bookingsChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingsChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="total" name="Reservas" fill="#34d399" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Nenhuma reserva cadastrada
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
