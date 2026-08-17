"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { RelatorioFutebolDeptShell } from "@/components/dashboard/futebol/relatorios/RelatorioFutebolDeptShell";
import { FutebolRelatorioEquipeForm } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioEquipeForm";

export default function FutebolRelatorioEquipePage() {
  return (
    <RelatorioFutebolDeptShell
      title="Relatório da equipe"
      backHref="/dashboard/relatorios/futebol"
      backLabel="Relatórios"
      accessModules={["relatorios_futebol", "diretoria", "futebol_treinadores"]}
    >
      <Suspense fallback={<Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />}>
        <FutebolRelatorioEquipeForm />
      </Suspense>
    </RelatorioFutebolDeptShell>
  );
}
