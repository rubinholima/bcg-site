"use client";

import { TreinadoresContextPanel } from "@/components/dashboard/futebol/treinadores/TreinadoresContextPanel";
import { TreinadoresTreinosTab } from "@/components/dashboard/futebol/treinadores/TreinadoresTreinosTab";
import { TreinadoresShell } from "@/components/dashboard/futebol/treinadores/TreinadoresShell";

export default function TreinadoresTreinosPage() {
  return (
    <TreinadoresShell title="Planejamento de treinos">
      <TreinadoresContextPanel>
        {({ tenantId, category, context }) => (
          <TreinadoresTreinosTab tenantId={tenantId} category={category} context={context} />
        )}
      </TreinadoresContextPanel>
    </TreinadoresShell>
  );
}
