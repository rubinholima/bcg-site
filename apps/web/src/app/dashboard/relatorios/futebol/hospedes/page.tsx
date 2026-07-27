"use client";

import { FutebolRelatorioHospedesForm } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioHospedesForm";
import { FutebolRelatorioShell } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioShell";

export default function FutebolRelatorioHospedesPage() {
  return (
    <FutebolRelatorioShell
      title="Relação de Hóspedes"
      description="Quartos e ocupantes da viagem — ideal para check-in no hotel."
    >
      <FutebolRelatorioHospedesForm />
    </FutebolRelatorioShell>
  );
}
