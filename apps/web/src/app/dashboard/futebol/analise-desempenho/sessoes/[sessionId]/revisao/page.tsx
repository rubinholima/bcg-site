"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AnaliseDesempenhoShell } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoShell";
import { LiveTagWorkspace } from "@/components/dashboard/futebol/analise-desempenho/LiveTagWorkspace";
import { ANALISE_DESEMPENHO_BASE } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoFilters";
import { api } from "@/lib/api";

export default function RevisaoPosJogoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = String(params.sessionId ?? "");
  const tenantId = searchParams.get("tenantId") ?? "";
  const qs = searchParams.toString();
  const suffix = qs ? `?${qs}` : "";

  async function goReview() {
    await api.patch(`/performance-analysis/sessions/${sessionId}/status`, { status: "review" });
  }

  return (
    <AnaliseDesempenhoShell title="Revisão pós-jogo" showFilters={false}>
      <div className="mb-3 flex flex-wrap gap-2">
        <Button size="sm" type="button" onClick={() => void goReview()}>
          Entrar em revisão
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href={`${ANALISE_DESEMPENHO_BASE}/sessoes/${sessionId}/live${suffix}`}>Live Tag</Link>
        </Button>
      </div>
      {tenantId ? (
        <LiveTagWorkspace sessionId={sessionId} tenantId={tenantId} mode="review" />
      ) : (
        <p className="text-sm text-muted-foreground">Selecione o clube nos filtros da área de análise.</p>
      )}
    </AnaliseDesempenhoShell>
  );
}
