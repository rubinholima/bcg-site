"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RelatorioFutebolDeptShell } from "@/components/dashboard/futebol/relatorios/RelatorioFutebolDeptShell";
import { FutebolCadastroPendenciesPanel } from "@/components/dashboard/futebol/relatorios/FutebolCadastroPendenciesPanel";

function PendenciasCadastroContent() {
  const searchParams = useSearchParams();
  const initialTenantId = searchParams.get("tenantId") ?? "";

  return <FutebolCadastroPendenciesPanel initialTenantId={initialTenantId} />;
}

export default function FutebolPendenciasCadastroPage() {
  return (
    <RelatorioFutebolDeptShell
      title="Pendências de cadastro (FMF)"
      backHref="/dashboard/relatorios/futebol"
      backLabel="Relatórios"
    >
      <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
        <PendenciasCadastroContent />
      </Suspense>
    </RelatorioFutebolDeptShell>
  );
}
