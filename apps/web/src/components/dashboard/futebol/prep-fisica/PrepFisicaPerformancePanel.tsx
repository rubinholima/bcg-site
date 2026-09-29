"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatDateDayMonYear } from "@/lib/format-date";

interface Props {
  tenantId: string;
  category?: string;
}

function range30() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export function PrepFisicaPerformancePanel({ tenantId, category }: Props) {
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState<{
    loadSessions: Array<{ id: string; sessionDate: string; sessionType: string; category: string | null; entries: unknown[] }>;
    assessments: Array<{ id: string; assessedAt: string; assessmentType: string }>;
  } | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    const { from, to } = range30();
    const params = new URLSearchParams({ tenantId, from, to });
    if (category) params.set("category", category);
    setLoading(true);
    api
      .get<typeof overview>(`/prep-fisica/performance-overview?${params}`)
      .then(({ data }) => setOverview(data))
      .catch(() => setOverview(null))
      .finally(() => setLoading(false));
  }, [tenantId, category]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sessões de carga (30d)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(overview?.loadSessions ?? []).slice(0, 12).map((s) => (
            <div key={s.id} className="flex justify-between rounded-md border border-border/50 px-3 py-2">
              <span>{formatDateDayMonYear(new Date(`${s.sessionDate}T12:00:00`))}</span>
              <span className="text-muted-foreground">
                {s.sessionType} · {(s.entries as unknown[]).length} atletas
              </span>
            </div>
          ))}
          {(overview?.loadSessions?.length ?? 0) === 0 ? (
            <p className="text-muted-foreground">Sem registros no período.</p>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Avaliações físicas recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(overview?.assessments ?? []).slice(0, 12).map((a) => (
            <div key={a.id} className="flex justify-between rounded-md border border-border/50 px-3 py-2">
              <span>{a.assessmentType}</span>
              <span className="text-muted-foreground">
                {formatDateDayMonYear(new Date(a.assessedAt))}
              </span>
            </div>
          ))}
          {(overview?.assessments?.length ?? 0) === 0 ? (
            <p className="text-muted-foreground">Sem avaliações no período.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
