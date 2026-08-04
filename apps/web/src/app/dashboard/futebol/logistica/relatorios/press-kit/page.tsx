"use client";

import { Suspense } from "react";
import { FutebolRelatorioPressKitForm } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioPressKitForm";
import { FutebolRelatorioShell } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioShell";

export default function LogisticaRelatorioPressKitPage() {
  return (
    <FutebolRelatorioShell
      title="Press Kit / Relatório Imprensa"
      backHref="/dashboard/futebol/logistica/relatorios"
      backLabel="Relatórios"
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
        <FutebolRelatorioPressKitForm />
      </Suspense>
    </FutebolRelatorioShell>
  );
}
