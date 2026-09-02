"use client";

import { DynamicReportsForm } from "@/components/dashboard/adm/relatorios/DynamicReportsForm";
import { RelatorioAdmDeptShell } from "@/components/dashboard/adm/relatorios/RelatorioAdmDeptShell";

export default function DynamicReportsPage() {
  return (
    <RelatorioAdmDeptShell
      title="Relatórios dinâmicos"
      backHref="/dashboard/relatorios/adm"
      backLabel="Relatórios ADM"
      accessModules={["relatorios_adm", "adm_rh", "adm_financeiro"]}
    >
      <DynamicReportsForm />
    </RelatorioAdmDeptShell>
  );
}
