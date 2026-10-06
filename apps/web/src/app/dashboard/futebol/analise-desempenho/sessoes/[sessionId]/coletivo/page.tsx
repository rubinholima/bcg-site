"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AnaliseDesempenhoShell } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoShell";
import { CollectiveAnalysisView } from "@/components/dashboard/futebol/analise-desempenho/CollectiveAnalysisView";
import { ANALISE_DESEMPENHO_BASE } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoFilters";

export default function ColetivoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = String(params.sessionId ?? "");
  const qs = searchParams.toString();
  const suffix = qs ? `?${qs}` : "";

  return (
    <AnaliseDesempenhoShell title="Análise coletiva" showFilters={false}>
      <Button size="sm" variant="ghost" className="mb-3" asChild>
        <Link href={`${ANALISE_DESEMPENHO_BASE}/sessoes/${sessionId}${suffix}`}>Voltar</Link>
      </Button>
      <CollectiveAnalysisView sessionId={sessionId} />
    </AnaliseDesempenhoShell>
  );
}
