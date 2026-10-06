"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AnaliseDesempenhoShell } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoShell";
import { IndividualAnalysisView } from "@/components/dashboard/futebol/analise-desempenho/IndividualAnalysisView";
import { ANALISE_DESEMPENHO_BASE } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoFilters";

export default function IndividualPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = String(params.sessionId ?? "");
  const tenantId = searchParams.get("tenantId") ?? "";
  const qs = searchParams.toString();
  const suffix = qs ? `?${qs}` : "";

  return (
    <AnaliseDesempenhoShell title="Análise individual" showFilters={false}>
      <Button size="sm" variant="ghost" className="mb-3" asChild>
        <Link href={`${ANALISE_DESEMPENHO_BASE}/sessoes/${sessionId}${suffix}`}>Voltar</Link>
      </Button>
      {tenantId ? (
        <IndividualAnalysisView sessionId={sessionId} tenantId={tenantId} />
      ) : (
        <p className="text-sm text-muted-foreground">Informe tenantId na URL.</p>
      )}
    </AnaliseDesempenhoShell>
  );
}
