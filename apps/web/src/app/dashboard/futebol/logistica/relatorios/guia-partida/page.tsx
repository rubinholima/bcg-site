"use client";

import { Suspense } from "react";
import { FutebolRelatorioGuiaPartidaForm } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioGuiaPartidaForm";
import { FutebolRelatorioShell } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioShell";

export default function LogisticaRelatorioGuiaPartidaPage() {
  return (
    <FutebolRelatorioShell
      title="Guia da Partida"
      backHref="/dashboard/futebol/logistica/relatorios"
      backLabel="Relatórios"
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
        <FutebolRelatorioGuiaPartidaForm />
      </Suspense>
    </FutebolRelatorioShell>
  );
}
