"use client";

import { PrepFisicaContextPanel } from "@/components/dashboard/futebol/prep-fisica/PrepFisicaContextPanel";
import { PrepFisicaShell } from "@/components/dashboard/futebol/prep-fisica/PrepFisicaShell";
import { PrepFisicaTreinosTab } from "@/components/dashboard/futebol/prep-fisica/PrepFisicaTreinosTab";

export default function PrepFisicaTreinosPage() {
  return (
    <PrepFisicaShell title="Treinos">
      <PrepFisicaContextPanel>
        {({ tenantId, category, context }) => (
          <PrepFisicaTreinosTab tenantId={tenantId} category={category} context={context} />
        )}
      </PrepFisicaContextPanel>
    </PrepFisicaShell>
  );
}
