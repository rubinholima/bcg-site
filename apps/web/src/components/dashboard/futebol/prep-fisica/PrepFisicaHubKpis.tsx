"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";

interface Props {
  tenantId: string;
  category?: string;
}

type Kpis = {
  prepSessionsCount: number;
  avgAthleteRating: number | null;
  avgPse: number | null;
  pseSubmissions: number;
  consolidatedTrainingMinutes: number;
  tacticalMinutes: number;
  physicalMinutes: number;
  gpsSessions: number;
  nonGpsSessions: number;
};

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export function PrepFisicaHubKpis({ tenantId, category }: Props) {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    const { from, to } = defaultRange();
    const params = new URLSearchParams({ tenantId, from, to });
    if (category) params.set("category", category);
    setLoading(true);
    api
      .get<Kpis>(`/prep-fisica/kpis?${params}`)
      .then(({ data }) => setKpis(data))
      .catch(() => setKpis(null))
      .finally(() => setLoading(false));
  }, [tenantId, category]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!kpis) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Treinos (30d)</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-bold tabular-nums">{kpis.prepSessionsCount}</CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Média avaliação 0–5</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-bold tabular-nums">
          {kpis.avgAthleteRating != null ? kpis.avgAthleteRating.toFixed(1) : "—"}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">PSE médio</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-bold tabular-nums">
          {kpis.avgPse != null ? kpis.avgPse.toFixed(1) : "—"}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Minutos consolidados</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="text-2xl font-bold tabular-nums">{kpis.consolidatedTrainingMinutes}</p>
          <p className="mt-1 text-muted-foreground">
            Téc./tát. {kpis.tacticalMinutes} · Fís. {kpis.physicalMinutes}
          </p>
          <p className="text-xs text-muted-foreground">
            GPS {kpis.gpsSessions} · Sem GPS {kpis.nonGpsSessions}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
