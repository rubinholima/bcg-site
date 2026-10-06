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

type PrepRow = {
  id: string;
  title: string;
  opponentName: string | null;
  matchDate: string | null;
  category: string | null;
  versions: Array<{ id: string; lifecycle: string; versionNumber: number }>;
};

export default function PreJogoListPage() {
  const { tenantId, category, qs } = useAnaliseDesempenhoQuery();
  const [rows, setRows] = useState<PrepRow[]>([]);
  const [loading, setLoading] = useState(false);
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
      .get<PrepRow[]>(`/performance-analysis/pre-match?${params}`)
      .then(({ data }) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [tenantId, category]);

  return (
    <AnaliseDesempenhoShell title="Pré-jogo">
      {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : null}
      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>Título</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Adversário</TableHead>
            <TableHead>Versão</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <ClickableTableRow key={r.id} href={`${ANALISE_DESEMPENHO_BASE}/pre-jogo/${r.id}${suffix}`}>
              <TableCell className="font-medium">{r.title}</TableCell>
              <TableCell>{r.matchDate ?? "—"}</TableCell>
              <TableCell>{r.opponentName ?? "—"}</TableCell>
              <TableCell>
                {r.versions[0]
                  ? `v${r.versions[0].versionNumber} · ${r.versions[0].lifecycle}`
                  : "—"}
              </TableCell>
            </ClickableTableRow>
          ))}
          {rows.length === 0 && !loading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                Nenhuma preparação. Crie a partir de uma viagem/logística quando disponível.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </AnaliseDesempenhoShell>
  );
}
