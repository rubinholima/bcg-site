"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AnaliseDesempenhoShell } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoShell";
import {
  useAnaliseDesempenhoQuery,
  AnaliseDesempenhoFilters,
} from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoFilters";
import { KpiCard } from "@/components/dashboard/cup360/KpiCard";
import { AnalysisPitchHeatmap } from "@/components/dashboard/futebol/analise-desempenho/AnalysisPitchHeatmap";
import { api } from "@/lib/api";
import type { TeamMetrics } from "@/lib/performance-analysis-types";
import type { AnalysisPitchZoneKey } from "@/lib/analysis-pitch-zones";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type SeasonDashboard = {
  season: number;
  category: string | null;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  pointsPct: number | null;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  metrics: TeamMetrics;
  metricsProprio: TeamMetrics;
  metricsAdversario: TeamMetrics;
  zoneHeat: Partial<Record<AnalysisPitchZoneKey, number>>;
  matches: Array<{
    sessionId: string;
    title: string;
    scoreUs: number | null;
    scoreThem: number | null;
    result: "V" | "E" | "D" | null;
    playedAt: string;
  }>;
};

export default function AnaliseCampeonatoPage() {
  const { tenantId, category } = useAnaliseDesempenhoQuery();
  const [season, setSeason] = useState(String(new Date().getFullYear()));
  const [data, setData] = useState<SeasonDashboard | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!tenantId) return;
    const s = Number(season);
    if (!Number.isFinite(s)) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        tenantId,
        season: String(s),
      });
      if (category) params.set("category", category);
      const { data: d } = await api.get<SeasonDashboard>(
        `/performance-analysis/season-dashboard?${params.toString()}`,
      );
      setData(d);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId, season, category]);

  useEffect(() => {
    void load();
  }, [load]);

  const m = data?.metrics;

  return (
    <AnaliseDesempenhoShell title="Campeonato" showFilters>
      <AnaliseDesempenhoFilters />
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          Temporada
          <input
            type="number"
            className="h-10 w-28 rounded-md border border-input bg-background px-3 text-foreground"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
          />
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <p className="py-8 text-center text-muted-foreground">Sem dados para esta temporada.</p>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <KpiCard label="Jogos" value={data.matchesPlayed} />
            <KpiCard label="Vitórias" value={data.wins} />
            <KpiCard label="Empates" value={data.draws} />
            <KpiCard label="Derrotas" value={data.losses} />
            <KpiCard label="Gols marcados" value={data.goalsFor} />
            <KpiCard label="Gols sofridos" value={data.goalsAgainst} />
            <KpiCard
              label="Aproveitamento"
              value={data.pointsPct != null ? `${data.pointsPct}%` : "—"}
            />
          </div>

          {m ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Finalizações" value={m.shots} />
              <KpiCard label="No gol" value={m.shotsOnGoal} />
              <KpiCard label="Bloqueadas" value={m.shotsBlocked ?? 0} />
              <KpiCard label="Para fora" value={m.shotsOffTarget ?? 0} />
              <KpiCard label="Faltas (tag)" value={m.fouls ?? 0} />
              <KpiCard label="Escanteios a favor" value={m.cornersFor ?? 0} />
              <KpiCard label="Amarelos" value={m.yellowCards ?? 0} />
              <KpiCard label="Vermelhos" value={m.redCards ?? 0} />
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <AnalysisPitchHeatmap title="Mapa de calor — temporada" counts={data.zoneHeat} />
            <div className="space-y-3">
              <p className="text-sm font-medium">Nosso time vs adversário (eventos tagueados)</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <KpiCard label="Gols (tag) — nosso" value={data.metricsProprio.goals ?? 0} />
                <KpiCard label="Gols (tag) — adversário" value={data.metricsAdversario.goals ?? 0} />
                <KpiCard label="Faltas — nosso" value={data.metricsProprio.fouls ?? 0} />
                <KpiCard label="Faltas — adversário" value={data.metricsAdversario.fouls ?? 0} />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Partida</TableHead>
                  <TableHead>Placar</TableHead>
                  <TableHead>Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.matches.map((row) => (
                  <TableRow key={row.sessionId}>
                    <TableCell>{row.title}</TableCell>
                    <TableCell className="tabular-nums">
                      {row.scoreUs ?? "—"} × {row.scoreThem ?? "—"}
                    </TableCell>
                    <TableCell>
                      {row.result === "V"
                        ? "Vitória"
                        : row.result === "E"
                          ? "Empate"
                          : row.result === "D"
                            ? "Derrota"
                            : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </AnaliseDesempenhoShell>
  );
}
