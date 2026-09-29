"use client";

import { PrepFisicaContextPanel } from "@/components/dashboard/futebol/prep-fisica/PrepFisicaContextPanel";
import { PrepFisicaPseTab } from "@/components/dashboard/futebol/prep-fisica/PrepFisicaPseTab";
import { PrepFisicaShell } from "@/components/dashboard/futebol/prep-fisica/PrepFisicaShell";

export default function PrepFisicaPsePage() {
  return (
    <PrepFisicaShell title="PSE">
      <PrepFisicaContextPanel>
        {({ tenantId, category }) => <PrepFisicaPseTab tenantId={tenantId} category={category} />}
      </PrepFisicaContextPanel>
    </PrepFisicaShell>
  );
}
