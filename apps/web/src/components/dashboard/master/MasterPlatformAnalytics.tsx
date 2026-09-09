"use client";

import { useCallback, useEffect, useState } from "react";
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
import { authFetch } from "@/lib/authFetch";
import type { PlatformInsightsResponse } from "@/lib/master-ops-types";
import { formatDateTimeDayMonYear } from "@/lib/format-date";
import { cup360 } from "@/lib/cup360-design-tokens";
import {
  MASTER_CHART_COLORS,
  MasterChartTooltip,
  OpsSection,
} from "./master-ops-ui";

export type RoleDistributionRow = {
  name: string;
  count: number;
};

function AnalyticsChart({
  title,
  subtitle,
  data,
  emptyLabel,
}: {
  title: string;
  subtitle: string;
  data: Array<{ name: string; count: number }>;
  emptyLabel: string;
}) {
  return (
    <div className="flex min-h-[280px] flex-col rounded-lg border border-border/60 bg-muted/10 p-4">
      <div className="mb-3">
        <h3 className={cup360.type.sectionTitle}>{title}</h3>
        <p className={cup360.type.caption}>{subtitle}</p>
      </div>
      {data.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <div className="h-[220px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border) / 0.5)" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis
                type="category"
                dataKey="name"
                width={108}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip content={<MasterChartTooltip />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
                {data.map((_, index) => (
                  <Cell key={index} fill={MASTER_CHART_COLORS[index % MASTER_CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function HourlyActivityChart({ data }: { data: PlatformInsightsResponse["hourlyActivity"] }) {
  return (
    <div className="flex min-h-[280px] flex-col rounded-lg border border-border/60 bg-muted/10 p-4">
      <div className="mb-3">
        <h3 className={cup360.type.sectionTitle}>Atividade por hora (hoje)</h3>
        <p className={cup360.type.caption}>
          Usuários distintos com sessão registrada em cada hora — dados reais de presença
        </p>
      </div>
      {data.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Sem atividade registrada hoje.
        </div>
      ) : (
        <div className="h-[220px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.5)" />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip content={<MasterChartTooltip />} />
              <Bar dataKey="users" fill="hsl(262 52% 58%)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function MasterPlatformAnalytics({
  usersByRole,
}: {
  usersByRole: RoleDistributionRow[];
}) {
  const [insights, setInsights] = useState<PlatformInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await authFetch("/api/master/platform-insights");
      if (res.ok) setInsights((await res.json()) as PlatformInsightsResponse);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const roleChartData =
    usersByRole.length > 0
      ? usersByRole.slice(0, 8)
      : (insights?.byRoleLive ?? []);

  return (
    <OpsSection
      title="Analytics da plataforma"
      description="Distribuição operacional com dados reais — presença ao vivo e cadastro global"
      action={
        insights?.asOf ? (
          <span className={cup360.type.caption}>
            {formatDateTimeDayMonYear(insights.asOf)}
          </span>
        ) : null
      }
    >
      {loading && !insights ? (
        <p className={cup360.type.caption}>Carregando analytics…</p>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="min-w-0 lg:col-span-2">
            <HourlyActivityChart data={insights?.hourlyActivity ?? []} />
          </div>
          <AnalyticsChart
            title="Usuários online por empresa"
            subtitle="Sessões ativas agora, agrupadas por tenant"
            data={insights?.byCompany ?? []}
            emptyLabel="Nenhuma sessão ativa por empresa."
          />
          <AnalyticsChart
            title="Usuários online por módulo"
            subtitle="Onde os usuários estão navegando neste momento"
            data={insights?.byModule ?? []}
            emptyLabel="Nenhuma sessão com módulo identificado."
          />
          <AnalyticsChart
            title="Distribuição por perfil"
            subtitle={
              usersByRole.length > 0
                ? "Todos os usuários cadastrados na plataforma"
                : "Perfis das sessões ativas (fallback ao vivo)"
            }
            data={roleChartData}
            emptyLabel="Sem dados de perfil disponíveis."
          />
        </div>
      )}
    </OpsSection>
  );
}
