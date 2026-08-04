"use client";

import { Suspense } from "react";
import { FutebolRelatorioPassageirosForm } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioPassageirosForm";
import { FutebolRelatorioShell } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioShell";

export default function LogisticaRelatorioPassageirosPage() {
  return (
    <FutebolRelatorioShell
      title="Passageiros"
      backHref="/dashboard/futebol/logistica/relatorios"
      backLabel="Relatórios"
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
        <FutebolRelatorioPassageirosForm />
      </Suspense>
    </FutebolRelatorioShell>
  );
}
