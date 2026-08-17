"use client";

import { Suspense } from "react";
import { RelatorioFutebolDeptShell } from "@/components/dashboard/futebol/relatorios/RelatorioFutebolDeptShell";
import { FutebolRelatorioPressKitForm } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioPressKitForm";

export default function FutebolRelatorioPressKitPage() {
  return (
    <RelatorioFutebolDeptShell
      title="Press Kit / Imprensa"
      backHref="/dashboard/relatorios/futebol"
      backLabel="Relatórios"
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
        <FutebolRelatorioPressKitForm />
      </Suspense>
    </RelatorioFutebolDeptShell>
  );
}
