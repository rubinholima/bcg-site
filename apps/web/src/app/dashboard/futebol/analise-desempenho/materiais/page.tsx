"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { AnaliseDesempenhoShell } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoShell";
import {
  ANALISE_DESEMPENHO_BASE,
  useAnaliseDesempenhoQuery,
} from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoFilters";
import { api } from "@/lib/api";
import type { AnalysisSessionListItem } from "@/lib/performance-analysis-types";

export default function MateriaisPage() {
  const { tenantId, qs } = useAnaliseDesempenhoQuery();
  const [sessions, setSessions] = useState<AnalysisSessionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const suffix = qs ? `?${qs}` : "";

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    api
      .get<AnalysisSessionListItem[]>(`/performance-analysis/sessions?tenantId=${tenantId}&limit=50`)
      .then(({ data }) => setSessions(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [tenantId]);

  return (
    <AnaliseDesempenhoShell title="Clips / materiais">
      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : null}
      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>Sessão</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Vídeos</TableHead>
            <TableHead>Eventos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((s) => (
            <ClickableTableRow key={s.id} href={`${ANALISE_DESEMPENHO_BASE}/sessoes/${s.id}${suffix}`}>
              <TableCell>{s.title}</TableCell>
              <TableCell>{s.kind}</TableCell>
              <TableCell>{s.videoSourceCount}</TableCell>
              <TableCell>{s.eventCount}</TableCell>
            </ClickableTableRow>
          ))}
        </TableBody>
      </Table>
    </AnaliseDesempenhoShell>
  );
}
