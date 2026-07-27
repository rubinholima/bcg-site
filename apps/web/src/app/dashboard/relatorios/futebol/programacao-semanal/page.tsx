"use client";

import { FutebolRelatorioProgramacaoForm } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioProgramacaoForm";
import { FutebolRelatorioShell } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioShell";

export default function FutebolRelatorioProgramacaoPage() {
  return (
    <FutebolRelatorioShell
      title="Programação Semanal"
      description="Grade por dia e categoria com atividades da agenda operacional."
    >
      <FutebolRelatorioProgramacaoForm />
    </FutebolRelatorioShell>
  );
}
