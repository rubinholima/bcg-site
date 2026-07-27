"use client";

import { FutebolRelatorioPassageirosForm } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioPassageirosForm";
import { FutebolRelatorioShell } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioShell";

export default function FutebolRelatorioPassageirosPage() {
  return (
    <FutebolRelatorioShell
      title="Relação de Passageiros"
      description="Lista oficial para transporte — dados de logística e cadastro de atletas/comissão."
    >
      <FutebolRelatorioPassageirosForm />
    </FutebolRelatorioShell>
  );
}
