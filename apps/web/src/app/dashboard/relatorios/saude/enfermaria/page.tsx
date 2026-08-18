"use client";

import { Suspense } from "react";
import { EnfermariaRelatorioPanel } from "@/components/dashboard/saude/relatorios/EnfermariaRelatorioPanel";
import { RelatorioSaudeDeptShell } from "@/components/dashboard/saude/relatorios/RelatorioSaudeDeptShell";

export default function SaudeRelatorioEnfermariaPage() {
  return (
    <RelatorioSaudeDeptShell
      title="Enfermaria — Atendimentos"
      backHref="/dashboard/relatorios/saude"
      backLabel="Relatórios"
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
        <EnfermariaRelatorioPanel />
      </Suspense>
    </RelatorioSaudeDeptShell>
  );
}
