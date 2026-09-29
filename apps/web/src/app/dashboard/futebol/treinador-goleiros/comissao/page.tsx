"use client";

import { TreinadorGoleirosComissaoTab } from "@/components/dashboard/futebol/treinador-goleiros/TreinadorGoleirosComissaoTab";
import { TreinadorGoleirosContextPanel } from "@/components/dashboard/futebol/treinador-goleiros/TreinadorGoleirosContextPanel";
import { TreinadorGoleirosShell } from "@/components/dashboard/futebol/treinador-goleiros/TreinadorGoleirosShell";

export default function TreinadorGoleirosComissaoPage() {
  return (
    <TreinadorGoleirosShell title="Treinos da comissão">
      <TreinadorGoleirosContextPanel>
        {({ tenantId, category }) => (
          <TreinadorGoleirosComissaoTab tenantId={tenantId} category={category} />
        )}
      </TreinadorGoleirosContextPanel>
    </TreinadorGoleirosShell>
  );
}
