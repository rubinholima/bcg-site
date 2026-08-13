"use client";

import { Suspense } from "react";
import { RelatorioFutebolDeptShell } from "@/components/dashboard/futebol/relatorios/RelatorioFutebolDeptShell";
import { FutebolRelatorioSumulaCartoesForm } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioSumulaCartoesForm";

export default function FutebolRelatorioSumulaCartoesPage() {
  return (
    <RelatorioFutebolDeptShell
      title="Súmula e Cartões"
      backHref="/dashboard/relatorios/futebol"
      backLabel="Relatórios"
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
        <FutebolRelatorioSumulaCartoesForm />
      </Suspense>
    </RelatorioFutebolDeptShell>
  );
}
