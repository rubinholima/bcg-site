"use client";

import { TreinadoresContextPanel } from "@/components/dashboard/futebol/treinadores/TreinadoresContextPanel";
import { MelhoresTemporadaPanel } from "@/components/dashboard/futebol/treinadores/MelhoresTemporadaPanel";
import { TreinadoresShell } from "@/components/dashboard/futebol/treinadores/TreinadoresShell";

export default function MelhoresTemporadaPage() {
  return (
    <TreinadoresShell title="Melhores da Temporada">
      <TreinadoresContextPanel>
        {({ tenantId, category }) => (
          <MelhoresTemporadaPanel tenantId={tenantId} category={category} />
        )}
      </TreinadoresContextPanel>
    </TreinadoresShell>
  );
}
