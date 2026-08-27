"use client";

import { TreinadoresContextPanel } from "@/components/dashboard/futebol/treinadores/TreinadoresContextPanel";
import { CoachPlayerEvaluationPanel } from "@/components/dashboard/futebol/treinadores/CoachPlayerEvaluationPanel";
import { TreinadoresShell } from "@/components/dashboard/futebol/treinadores/TreinadoresShell";

export default function TreinadoresAvaliacaoJogadorPage() {
  return (
    <TreinadoresShell title="Avaliação individual">
      <TreinadoresContextPanel>
        {({ tenantId, category, context, contextLoading }) => (
          <CoachPlayerEvaluationPanel
            tenantId={tenantId}
            category={category}
            contextLoading={contextLoading}
            context={context}
          />
        )}
      </TreinadoresContextPanel>
    </TreinadoresShell>
  );
}
