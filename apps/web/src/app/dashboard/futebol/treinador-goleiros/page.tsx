"use client";

import { TreinadorGoleirosContextPanel } from "@/components/dashboard/futebol/treinador-goleiros/TreinadorGoleirosContextPanel";
import { TreinadorGoleirosHubKpis } from "@/components/dashboard/futebol/treinador-goleiros/TreinadorGoleirosHubKpis";
import { TreinadorGoleirosShell } from "@/components/dashboard/futebol/treinador-goleiros/TreinadorGoleirosShell";

export default function TreinadorGoleirosHubPage() {
  return (
    <TreinadorGoleirosShell title="Treinador de goleiros">
      <TreinadorGoleirosContextPanel>
        {({ tenantId, category }) => <TreinadorGoleirosHubKpis tenantId={tenantId} category={category} />}
      </TreinadorGoleirosContextPanel>
    </TreinadorGoleirosShell>
  );
}
