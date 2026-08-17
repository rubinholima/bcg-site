"use client";

import { RelatorioFutebolDeptShell } from "@/components/dashboard/futebol/relatorios/RelatorioFutebolDeptShell";
import { FutebolRelatorioProgramacaoForm } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioProgramacaoForm";

export default function FutebolRelatorioProgramacaoSemanalPage() {
  return (
    <RelatorioFutebolDeptShell
      title="Programação semanal"
      backHref="/dashboard/relatorios/futebol"
      backLabel="Relatórios"
    >
      <FutebolRelatorioProgramacaoForm />
    </RelatorioFutebolDeptShell>
  );
}
