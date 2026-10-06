"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnaliseDesempenhoShell } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoShell";
import {
  ANALISE_DESEMPENHO_BASE,
  useAnaliseDesempenhoQuery,
} from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoFilters";
import { api } from "@/lib/api";

export default function AdversarioProfilePage() {
  const profileId = String(useParams().profileId ?? "");
  const { qs } = useAnaliseDesempenhoQuery();
  const suffix = qs ? `?${qs}` : "";
  const [loading, setLoading] = useState(true);
  const [bundle, setBundle] = useState<{
    profile: { opponentName: string; keyObservations?: string | null };
    observedMatches: Array<{ id: string; matchDate: string | null; facedOpponentName: string | null; competition: string | null }>;
    sessions: Array<{ id: string; status: string }>;
  } | null>(null);
  const [matchDate, setMatchDate] = useState("");
  const [faced, setFaced] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/performance-analysis/opponent-profiles/${profileId}`);
      setBundle(data as typeof bundle);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openAnalysis() {
    const { data } = await api.post<{ session: { id: string } }>(
      `/performance-analysis/opponent-profiles/${profileId}/open-analysis`,
    );
    window.location.href = `${ANALISE_DESEMPENHO_BASE}/sessoes/${data.session.id}${suffix}`;
  }

  async function addObservedMatch() {
    await api.post(`/performance-analysis/opponent-profiles/${profileId}/observed-matches`, {
      matchDate: matchDate || undefined,
      facedOpponentName: faced || undefined,
    });
    setMatchDate("");
    setFaced("");
    await load();
  }

  if (loading || !bundle) {
    return (
      <AnaliseDesempenhoShell title="Adversário">
        <Loader2 className="h-6 w-6 animate-spin" />
      </AnaliseDesempenhoShell>
    );
  }

  return (
    <AnaliseDesempenhoShell title={`Adversário · ${bundle.profile.opponentName}`}>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={() => void openAnalysis()}>
          {bundle.sessions[0] ? "Continuar análise" : "Abrir análise de vídeo"}
        </Button>
        {bundle.sessions[0] ? (
          <Button variant="outline" asChild>
            <Link href={`${ANALISE_DESEMPENHO_BASE}/sessoes/${bundle.sessions[0].id}${suffix}`}>
              Workspace
            </Link>
          </Button>
        ) : null}
      </div>

      <section className="mt-6 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Jogos observados
        </h2>
        <ul className="divide-y rounded-md border border-border text-sm">
          {bundle.observedMatches.map((m) => (
            <li key={m.id} className="px-3 py-2">
              {m.matchDate ?? "—"} · vs {m.facedOpponentName ?? "—"} · {m.competition ?? "—"}
            </li>
          ))}
          {bundle.observedMatches.length === 0 ? (
            <li className="px-3 py-2 text-muted-foreground">Nenhum jogo registrado.</li>
          ) : null}
        </ul>
        <div className="flex flex-wrap gap-2 pt-2">
          <Input type="date" className="w-auto text-foreground" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} />
          <Input
            placeholder="Adversário enfrentado…"
            value={faced}
            onChange={(e) => setFaced(e.target.value)}
            className="max-w-xs text-foreground"
          />
          <Button type="button" variant="outline" onClick={() => void addObservedMatch()}>
            Adicionar jogo observado
          </Button>
        </div>
      </section>
    </AnaliseDesempenhoShell>
  );
}
