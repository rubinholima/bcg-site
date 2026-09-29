"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/cup360/KpiCard";
import { api } from "@/lib/api";
import type { GkKpis } from "@/lib/treinador-goleiros-types";

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

interface Props {
  tenantId: string;
  category?: string;
}

export function TreinadorGoleirosHubKpis({ tenantId, category }: Props) {
  const [kpis, setKpis] = useState<GkKpis | null>(null);
  const [loading, setLoading] = useState(false);
  const range = useMemo(() => defaultRange(), []);

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    const params = new URLSearchParams({
      tenantId,
      from: range.from,
      to: range.to,
    });
    if (category) params.set("category", category);
    api
      .get<GkKpis>(`/treinador-goleiros/kpis?${params}`)
      .then(({ data }) => setKpis(data))
      .catch(() => setKpis(null))
      .finally(() => setLoading(false));
  }, [tenantId, category, range.from, range.to]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!kpis) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Últimos 30 dias</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Treinos específicos" value={kpis.gkSessions} />
        <KpiCard label="Goleiros ativos" value={kpis.activeGoalkeepers} />
        <KpiCard label="Presenças registradas" value={kpis.attendanceEntries} />
        <KpiCard
          label="Média avaliação"
          value={kpis.averageRating != null ? String(kpis.averageRating) : "—"}
        />
        <KpiCard label="Cross-category" value={kpis.crossCategoryParticipations} />
        <KpiCard label="Análises de jogo" value={kpis.matchAnalyses} />
        <KpiCard label="Análises concluídas" value={kpis.matchAnalysesCompleted} />
        <KpiCard label="Com PDF Keeper Scout" value={kpis.analysesWithKeeperPdf} />
        <KpiCard label="Com vídeo YouTube" value={kpis.analysesWithVideo} />
        <KpiCard label="Artefatos pendentes" value={kpis.missingAnalysisArtifacts} />
      </CardContent>
    </Card>
  );
}
