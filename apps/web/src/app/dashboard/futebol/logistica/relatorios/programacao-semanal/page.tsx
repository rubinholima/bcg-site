"use client";

import { FutebolRelatorioProgramacaoForm } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioProgramacaoForm";
import { FutebolRelatorioShell } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioShell";

export default function LogisticaRelatorioProgramacaoPage() {
  return (
    <FutebolRelatorioShell
      title="Programação semanal"
      backHref="/dashboard/futebol/logistica/relatorios"
      backLabel="Relatórios"
    >
      <FutebolRelatorioProgramacaoForm />
    </FutebolRelatorioShell>
  );
}
