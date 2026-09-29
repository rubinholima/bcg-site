"use client";

import { TreinadorGoleirosAnalisesTab } from "@/components/dashboard/futebol/treinador-goleiros/TreinadorGoleirosAnalisesTab";
import { TreinadorGoleirosContextPanel } from "@/components/dashboard/futebol/treinador-goleiros/TreinadorGoleirosContextPanel";
import { TreinadorGoleirosShell } from "@/components/dashboard/futebol/treinador-goleiros/TreinadorGoleirosShell";

export default function TreinadorGoleirosAnalisesPage() {
  return (
    <TreinadorGoleirosShell title="Análises de jogo">
      <TreinadorGoleirosContextPanel>
        {({ tenantId, category, context }) => (
          <TreinadorGoleirosAnalisesTab tenantId={tenantId} category={category} context={context} />
        )}
      </TreinadorGoleirosContextPanel>
    </TreinadorGoleirosShell>
  );
}
