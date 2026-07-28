"use client";

import { FutebolRelatorioPassageirosForm } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioPassageirosForm";
import { FutebolRelatorioShell } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioShell";

export default function LogisticaRelatorioPassageirosPage() {
  return (
    <FutebolRelatorioShell
      title="Passageiros"
      backHref="/dashboard/futebol/logistica/relatorios"
      backLabel="Relatórios"
    >
      <FutebolRelatorioPassageirosForm />
    </FutebolRelatorioShell>
  );
}
