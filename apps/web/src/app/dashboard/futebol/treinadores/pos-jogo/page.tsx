"use client";

import { TreinadoresContextPanel } from "@/components/dashboard/futebol/treinadores/TreinadoresContextPanel";
import { TreinadoresPosJogoTab } from "@/components/dashboard/futebol/treinadores/TreinadoresPosJogoTab";
import { TreinadoresShell } from "@/components/dashboard/futebol/treinadores/TreinadoresShell";

export default function TreinadoresPosJogoPage() {
  return (
    <TreinadoresShell title="Relatório pós-jogo">
      <TreinadoresContextPanel>
        {({ tenantId, category, context, contextLoading }) => (
          <TreinadoresPosJogoTab
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
