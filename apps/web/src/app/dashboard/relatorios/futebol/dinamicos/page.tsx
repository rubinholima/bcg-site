"use client";

import { DynamicReportsForm } from "@/components/dashboard/adm/relatorios/DynamicReportsForm";
import { RelatorioFutebolDeptShell } from "@/components/dashboard/futebol/relatorios/RelatorioFutebolDeptShell";

export default function FutebolDynamicReportsPage() {
  return (
    <RelatorioFutebolDeptShell
      title="Relatórios dinâmicos"
      backHref="/dashboard/relatorios/futebol"
      backLabel="Relatórios"
      accessModules={["relatorios_futebol"]}
    >
      <DynamicReportsForm />
    </RelatorioFutebolDeptShell>
  );
}
