"use client";

import { FutebolRelatorioHospedesForm } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioHospedesForm";
import { FutebolRelatorioShell } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioShell";

export default function LogisticaRelatorioHospedesPage() {
  return (
    <FutebolRelatorioShell
      title="Hóspedes"
      backHref="/dashboard/futebol/logistica/relatorios"
      backLabel="Relatórios"
    >
      <FutebolRelatorioHospedesForm />
    </FutebolRelatorioShell>
  );
}
