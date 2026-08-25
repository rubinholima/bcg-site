"use client";

import { TreinadoresContextPanel } from "@/components/dashboard/futebol/treinadores/TreinadoresContextPanel";
import { CoachTeamReportPanel } from "@/components/dashboard/futebol/treinadores/CoachTeamReportPanel";
import { TreinadoresShell } from "@/components/dashboard/futebol/treinadores/TreinadoresShell";

export default function TreinadoresRelatorioEquipePage() {
  return (
    <TreinadoresShell title="Relatório da equipe">
      <TreinadoresContextPanel>
        {({ tenantId, category, context, contextLoading }) => (
          <CoachTeamReportPanel
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
