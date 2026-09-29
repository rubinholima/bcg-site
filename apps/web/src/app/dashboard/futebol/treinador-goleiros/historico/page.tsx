"use client";

import { TreinadorGoleirosContextPanel } from "@/components/dashboard/futebol/treinador-goleiros/TreinadorGoleirosContextPanel";
import { TreinadorGoleirosHistoricoTab } from "@/components/dashboard/futebol/treinador-goleiros/TreinadorGoleirosHistoricoTab";
import { TreinadorGoleirosShell } from "@/components/dashboard/futebol/treinador-goleiros/TreinadorGoleirosShell";

export default function TreinadorGoleirosHistoricoPage() {
  return (
    <TreinadorGoleirosShell title="Histórico / Relatórios">
      <TreinadorGoleirosContextPanel>
        {({ tenantId, category, context }) => (
          <TreinadorGoleirosHistoricoTab tenantId={tenantId} category={category} context={context} />
        )}
      </TreinadorGoleirosContextPanel>
    </TreinadorGoleirosShell>
  );
}
