"use client";

import { Suspense } from "react";
import { MedicalDepartureRelatorioPanel } from "@/components/dashboard/medico/MedicalDepartureRelatorioPanel";
import { RelatorioSaudeDeptShell } from "@/components/dashboard/saude/relatorios/RelatorioSaudeDeptShell";

export default function SaudeRelatorioSaidasCtPage() {
  return (
    <RelatorioSaudeDeptShell
      title="Saídas do CT"
      backHref="/dashboard/relatorios/saude"
      backLabel="Relatórios"
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
        <MedicalDepartureRelatorioPanel />
      </Suspense>
    </RelatorioSaudeDeptShell>
  );
}
