"use client";

import { TreinadoresContextPanel } from "@/components/dashboard/futebol/treinadores/TreinadoresContextPanel";
import { MelhoresTemporadaPanel } from "@/components/dashboard/futebol/treinadores/MelhoresTemporadaPanel";
import { MelhoresTemporadaShell } from "@/components/dashboard/futebol/treinadores/MelhoresTemporadaShell";

export default function MelhoresTemporadaPage() {
  return (
    <MelhoresTemporadaShell>
      <TreinadoresContextPanel>
        {({ tenantId, category }) => (
          <MelhoresTemporadaPanel tenantId={tenantId} category={category} />
        )}
      </TreinadoresContextPanel>
    </MelhoresTemporadaShell>
  );
}
