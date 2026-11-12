"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NativeSelectField } from "@/components/ui/native-select";
import { AnaliseDesempenhoShell } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoShell";
import {
  ANALISE_DESEMPENHO_BASE,
  useAnaliseDesempenhoQuery,
} from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoFilters";
import { api } from "@/lib/api";

type ClipRow = {
  id: string;
  title: string;
  startMs: number;
  endMs: number;
  analysisSession: { id: string; title: string; kind: string; status: string; category: string | null };
  players: Array<{ player: { id: string; name: string } | null }>;
};

export default function MateriaisPage() {
  const { tenantId, qs } = useAnaliseDesempenhoQuery();
  const [clips, setClips] = useState<ClipRow[]>([]);
  const [sessionFilter, setSessionFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const suffix = qs ? `?${qs}` : "";

  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    const params = new URLSearchParams({ tenantId, limit: "80" });
    if (sessionFilter) params.set("sessionId", sessionFilter);
    api
      .get<ClipRow[]>(`/performance-analysis/clips?${params}`)
      .then(({ data }) => setClips(Array.isArray(data) ? data : []))
      .catch(() => setClips([]))
      .finally(() => setLoading(false));
  }, [tenantId, sessionFilter]);

  return (
    <AnaliseDesempenhoShell title="Clipes e materiais">
      <div className="mt-4 max-w-md">
        <NativeSelectField
          value={sessionFilter}
          onChange={(e) => setSessionFilter(e.target.value)}
          placeholder="Filtrar por sessão (ID)"
          options={[{ value: "", label: "Todas as sessões" }]}
        />
      </div>
      {loading ? <Loader2 className="mt-4 h-6 w-6 animate-spin" /> : null}
      <Table className="mt-4">
        <TableHeader>
          <TableRow>
            <TableHead>Clip</TableHead>
            <TableHead>Sessão</TableHead>
            <TableHead>Atletas</TableHead>
            <TableHead>Início</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clips.map((c) => (
            <TableRow key={c.id}>
              <TableCell>{c.title}</TableCell>
              <TableCell>
                <Link
                  href={`${ANALISE_DESEMPENHO_BASE}/sessoes/${c.analysisSession.id}${suffix}`}
                  className="text-violet-300 hover:underline"
                >
                  {c.analysisSession.title}
                </Link>
              </TableCell>
              <TableCell className="text-xs">
                {c.players.map((p) => p.player?.name).filter(Boolean).join(", ") || "—"}
              </TableCell>
              <TableCell>{Math.floor(c.startMs / 1000)}s</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </AnaliseDesempenhoShell>
  );
}
