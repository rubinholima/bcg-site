"use client";

import { PrepFisicaContextPanel } from "@/components/dashboard/futebol/prep-fisica/PrepFisicaContextPanel";
import { PrepFisicaPerformancePanel } from "@/components/dashboard/futebol/prep-fisica/PrepFisicaPerformancePanel";
import { PrepFisicaShell } from "@/components/dashboard/futebol/prep-fisica/PrepFisicaShell";

export default function PrepFisicaPerformancePage() {
  return (
    <PrepFisicaShell title="Performance integrada">
      <PrepFisicaContextPanel>
        {({ tenantId, category }) => (
          <PrepFisicaPerformancePanel tenantId={tenantId} category={category} />
        )}
      </PrepFisicaContextPanel>
    </PrepFisicaShell>
  );
}
