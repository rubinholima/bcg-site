"use client";

import { Suspense } from "react";
import { RelatorioAdmDeptShell } from "@/components/dashboard/adm/relatorios/RelatorioAdmDeptShell";
import { ComprasEstoqueRelatorioPanel } from "@/components/dashboard/adm/relatorios/ComprasEstoqueRelatorioPanel";

export default function AdmRelatorioEstoqueComprasPage() {
  return (
    <RelatorioAdmDeptShell
      title="Estoque e Compras"
      backHref="/dashboard/relatorios/adm"
      backLabel="Relatórios"
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
        <ComprasEstoqueRelatorioPanel />
      </Suspense>
    </RelatorioAdmDeptShell>
  );
}
