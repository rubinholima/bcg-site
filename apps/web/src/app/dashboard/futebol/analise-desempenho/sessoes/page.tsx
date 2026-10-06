"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { AnaliseDesempenhoShell } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoShell";
import {
  ANALISE_DESEMPENHO_BASE,
  useAnaliseDesempenhoQuery,
} from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoFilters";
import { api } from "@/lib/api";
import type { AnalysisSessionListItem } from "@/lib/performance-analysis-types";

const KIND_LABEL: Record<string, string> = {
  MATCH: "Jogo",
  TRAINING: "Treino",
  OPPONENT: "Adversário",
  OTHER: "Outro",
};

export default function AnaliseDesempenhoSessoesPage() {
  const { tenantId, qs } = useAnaliseDesempenhoQuery();
  const [sessions, setSessions] = useState<AnalysisSessionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const suffix = qs ? `?${qs}` : "";

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    api
      .get<AnalysisSessionListItem[]>(`/performance-analysis/sessions?tenantId=${tenantId}&limit=80`)
      .then(({ data }) => setSessions(Array.isArray(data) ? data : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [tenantId]);

  return (
    <AnaliseDesempenhoShell title="Sessões de análise">
      <div className="mt-4">
        <Button asChild>
          <Link href={`${ANALISE_DESEMPENHO_BASE}/nova${suffix}`}>
            <Plus className="mr-2 h-4 w-4" />
            Nova análise
          </Link>
        </Button>
      </div>
      <div className="mt-6">
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Vídeos</TableHead>
                <TableHead className="text-right">Eventos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <ClickableTableRow
                  key={s.id}
                  href={`${ANALISE_DESEMPENHO_BASE}/sessoes/${s.id}${suffix}`}
                >
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell>{KIND_LABEL[s.kind] ?? s.kind}</TableCell>
                  <TableCell>{s.status}</TableCell>
                  <TableCell className="text-right">{s.videoSourceCount}</TableCell>
                  <TableCell className="text-right">{s.eventCount}</TableCell>
                </ClickableTableRow>
              ))}
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">
                    Nenhuma sessão.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        )}
      </div>
    </AnaliseDesempenhoShell>
  );
}
