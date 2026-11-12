"use client";

import { AnaliseDesempenhoShell } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoShell";
import { AnalysisTagManager } from "@/components/dashboard/futebol/analise-desempenho/AnalysisTagManager";
import { useAnaliseDesempenhoQuery } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoFilters";

export default function TagsConfigPage() {
  const { tenantId } = useAnaliseDesempenhoQuery();
  return (
    <AnaliseDesempenhoShell title="Configurar tags">
      {tenantId ? (
        <AnalysisTagManager tenantId={tenantId} />
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Selecione o clube no filtro.</p>
      )}
    </AnaliseDesempenhoShell>
  );
}
