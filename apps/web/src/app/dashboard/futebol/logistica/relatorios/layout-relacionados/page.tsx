"use client";

import { Suspense } from "react";
import { FutebolRelatorioLayoutRelacionadosForm } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioLayoutRelacionadosForm";
import { FutebolRelatorioShell } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioShell";

export default function LogisticaRelatorioLayoutRelacionadosPage() {
  return (
    <FutebolRelatorioShell
      title="Relacionados / Programação"
      backHref="/dashboard/futebol/logistica/relatorios"
      backLabel="Relatórios"
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
        <FutebolRelatorioLayoutRelacionadosForm />
      </Suspense>
    </FutebolRelatorioShell>
  );
}
