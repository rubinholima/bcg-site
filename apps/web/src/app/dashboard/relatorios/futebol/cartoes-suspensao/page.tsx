"use client";

import { Suspense } from "react";
import { RelatorioFutebolDeptShell } from "@/components/dashboard/futebol/relatorios/RelatorioFutebolDeptShell";
import { FutebolRelatorioCartoesSuspensaoForm } from "@/components/dashboard/futebol/relatorios/FutebolRelatorioCartoesSuspensaoForm";

export default function FutebolRelatorioCartoesSuspensaoPage() {
  return (
    <RelatorioFutebolDeptShell
      title="Cartões e Suspensão"
      backHref="/dashboard/relatorios/futebol"
      backLabel="Relatórios"
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
        <FutebolRelatorioCartoesSuspensaoForm />
      </Suspense>
    </RelatorioFutebolDeptShell>
  );
}
