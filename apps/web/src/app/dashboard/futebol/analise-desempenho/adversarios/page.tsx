"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClickableTableRow } from "@/components/ui/clickable-table-row";
import { AnaliseDesempenhoShell } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoShell";
import {
  ANALISE_DESEMPENHO_BASE,
  useAnaliseDesempenhoQuery,
} from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoFilters";
import { api } from "@/lib/api";

type ProfileRow = {
  id: string;
  opponentName: string;
  category: string | null;
  season: number | null;
  _count: { observedMatches: number; players: number; analysisSessions: number };
};

export default function AnaliseAdversariosPage() {
  const { tenantId, category, qs } = useAnaliseDesempenhoQuery();
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const suffix = qs ? `?${qs}` : "";

  function reload() {
    if (!tenantId) return;
    setLoading(true);
    const params = new URLSearchParams({ tenantId });
    if (category) params.set("category", category);
    api
      .get<ProfileRow[]>(`/performance-analysis/opponent-profiles?${params}`)
      .then(({ data }) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, [tenantId, category]);

  async function createProfile() {
    if (!tenantId || !name.trim()) return;
    await api.post("/performance-analysis/opponent-profiles", {
      tenantId,
      opponentName: name.trim(),
      category: category || undefined,
    });
    setName("");
    reload();
  }

  return (
    <AnaliseDesempenhoShell title="Adversários">
      <div className="mt-4 flex flex-wrap gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do adversário…"
          className="max-w-xs text-foreground"
        />
        <Button type="button" onClick={() => void createProfile()} disabled={!name.trim()}>
          <Plus className="mr-2 h-4 w-4" />
          Novo perfil
        </Button>
      </div>
      {loading ? <Loader2 className="mt-4 h-6 w-6 animate-spin" /> : null}
      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>Adversário</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Jogos observados</TableHead>
            <TableHead>Jogadores</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <ClickableTableRow
              key={r.id}
              href={`${ANALISE_DESEMPENHO_BASE}/adversarios/${r.id}${suffix}`}
            >
              <TableCell className="font-medium">{r.opponentName}</TableCell>
              <TableCell>{r.category ?? "—"}</TableCell>
              <TableCell>{r._count.observedMatches}</TableCell>
              <TableCell>{r._count.players}</TableCell>
            </ClickableTableRow>
          ))}
        </TableBody>
      </Table>
    </AnaliseDesempenhoShell>
  );
}
