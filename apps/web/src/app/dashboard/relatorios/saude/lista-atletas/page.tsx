"use client";

import { Suspense } from "react";
import { PsicologiaAtletasReportForm } from "@/components/dashboard/psychology/PsicologiaAtletasReportForm";
import { RelatorioSaudeDeptShell } from "@/components/dashboard/saude/relatorios/RelatorioSaudeDeptShell";

export default function SaudeRelatorioListaAtletasPage() {
  return (
    <RelatorioSaudeDeptShell
      title="Lista de atletas — Psicologia"
      backHref="/dashboard/relatorios/saude"
      backLabel="Relatórios"
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
        <PsicologiaAtletasReportForm />
      </Suspense>
    </RelatorioSaudeDeptShell>
  );
}
