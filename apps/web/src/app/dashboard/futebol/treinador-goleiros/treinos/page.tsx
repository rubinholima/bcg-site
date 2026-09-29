"use client";

import { TreinadorGoleirosContextPanel } from "@/components/dashboard/futebol/treinador-goleiros/TreinadorGoleirosContextPanel";
import { TreinadorGoleirosShell } from "@/components/dashboard/futebol/treinador-goleiros/TreinadorGoleirosShell";
import { TreinadorGoleirosTreinosTab } from "@/components/dashboard/futebol/treinador-goleiros/TreinadorGoleirosTreinosTab";

export default function TreinadorGoleirosTreinosPage() {
  return (
    <TreinadorGoleirosShell title="Treinos específicos">
      <TreinadorGoleirosContextPanel>
        {({ tenantId, category, context }) => (
          <TreinadorGoleirosTreinosTab tenantId={tenantId} category={category} context={context} />
        )}
      </TreinadorGoleirosContextPanel>
    </TreinadorGoleirosShell>
  );
}
