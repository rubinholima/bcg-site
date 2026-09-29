"use client";

import { PrepFisicaContextPanel } from "@/components/dashboard/futebol/prep-fisica/PrepFisicaContextPanel";
import { PrepFisicaPlanLibrary } from "@/components/dashboard/futebol/prep-fisica/PrepFisicaPlanLibrary";
import { PrepFisicaShell } from "@/components/dashboard/futebol/prep-fisica/PrepFisicaShell";

export default function PrepFisicaPlanosPage() {
  return (
    <PrepFisicaShell title="Planos">
      <PrepFisicaContextPanel>
        {({ tenantId, category }) => (
          <PrepFisicaPlanLibrary tenantId={tenantId} category={category} />
        )}
      </PrepFisicaContextPanel>
    </PrepFisicaShell>
  );
}
