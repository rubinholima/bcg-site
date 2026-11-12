"use client";

import { FinanceImportPanel } from "../finance-import-panel";
import { useFinanceiroTenant } from "../financeiro-tenant-shell";

export default function FinanceiroImportacoesPage() {
  const { tenantId } = useFinanceiroTenant();
  if (!tenantId) return null;
  return <FinanceImportPanel tenantId={tenantId} />;
}
