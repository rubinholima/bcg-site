"use client";

import { useParams } from "next/navigation";
import { AnaliseDesempenhoShell } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoShell";
import { PreMatchEditorWorkspace } from "@/components/dashboard/futebol/analise-desempenho/PreMatchEditorWorkspace";
import { useAnaliseDesempenhoQuery } from "@/components/dashboard/futebol/analise-desempenho/AnaliseDesempenhoFilters";

export default function PreJogoEditorPage() {
  const preparationId = String(useParams().preparationId ?? "");
  const { qs } = useAnaliseDesempenhoQuery();
  const suffix = qs ? `?${qs}` : "";

  return (
    <AnaliseDesempenhoShell title="Pré-jogo">
      <PreMatchEditorWorkspace preparationId={preparationId} querySuffix={suffix} />
    </AnaliseDesempenhoShell>
  );
}
