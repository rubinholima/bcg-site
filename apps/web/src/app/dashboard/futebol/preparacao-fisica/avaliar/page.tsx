"use client";

import { PrepFisicaAvaliarTab } from "@/components/dashboard/futebol/prep-fisica/PrepFisicaAvaliarTab";
import { PrepFisicaContextPanel } from "@/components/dashboard/futebol/prep-fisica/PrepFisicaContextPanel";
import { PrepFisicaShell } from "@/components/dashboard/futebol/prep-fisica/PrepFisicaShell";

export default function PrepFisicaAvaliarPage() {
  return (
    <PrepFisicaShell title="Avaliar sessão">
      <PrepFisicaContextPanel>
        {({ tenantId, category, context }) => (
          <PrepFisicaAvaliarTab tenantId={tenantId} category={category} context={context} />
        )}
      </PrepFisicaContextPanel>
    </PrepFisicaShell>
  );
}
