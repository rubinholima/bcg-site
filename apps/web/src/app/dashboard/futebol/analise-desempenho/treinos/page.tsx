"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AnaliseDesempenhoShell } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoShell";
import {
  ANALISE_DESEMPENHO_BASE,
  useAnaliseDesempenhoQuery,
} from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoFilters";
import { api } from "@/lib/api";

type TrainingRow = {
  trainingSessionId: string;
  sessionDate: string;
  category: string | null;
  objectives: string | null;
  status: string;
  coachName: string | null;
  analysisSession: { id: string; status: string } | null;
};

export default function AnaliseTreinosPage() {
  const { tenantId, category, qs } = useAnaliseDesempenhoQuery();
  const [rows, setRows] = useState<TrainingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const suffix = qs ? `?${qs}` : "";

  useEffect(() => {
    if (!tenantId) {
      setRows([]);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ tenantId });
    if (category) params.set("category", category);
    api
      .get<TrainingRow[]>(`/performance-analysis/training-sessions?${params}`)
      .then(({ data }) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [tenantId, category]);

  async function openAnalysis(trainingSessionId: string) {
    setBusy(trainingSessionId);
    try {
      const { data } = await api.post<{ session: { id: string } }>(
        `/performance-analysis/training-sessions/${trainingSessionId}/open-analysis`,
      );
      window.location.href = `${ANALISE_DESEMPENHO_BASE}/sessoes/${data.session.id}${suffix}`;
    } finally {
      setBusy(null);
    }
  }

  return (
    <AnaliseDesempenhoShell title="Treinos — análise de vídeo">
      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : null}
      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Treinador</TableHead>
            <TableHead>Status treino</TableHead>
            <TableHead>Análise</TableHead>
            <TableHead className="text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.trainingSessionId}>
              <TableCell>{r.sessionDate}</TableCell>
              <TableCell>{r.category ?? "—"}</TableCell>
              <TableCell>{r.coachName ?? "—"}</TableCell>
              <TableCell>{r.status}</TableCell>
              <TableCell>{r.analysisSession?.status ?? "—"}</TableCell>
              <TableCell className="text-right">
                {r.analysisSession ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`${ANALISE_DESEMPENHO_BASE}/sessoes/${r.analysisSession.id}${suffix}`}>
                      Continuar
                    </Link>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={busy === r.trainingSessionId}
                    onClick={() => void openAnalysis(r.trainingSessionId)}
                  >
                    Analisar treino
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && !loading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground">
                Nenhum treino encontrado.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </AnaliseDesempenhoShell>
  );
}
