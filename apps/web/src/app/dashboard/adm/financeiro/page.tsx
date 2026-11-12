"use client";

import { FinanceiroLancamentosPanel } from "./financeiro-lancamentos-panel";
import { useFinanceiroTenant } from "./financeiro-tenant-shell";

export default function AdmFinanceiroOverviewPage() {
  const { tenantId } = useFinanceiroTenant();

  if (!tenantId) return null;

  return <FinanceiroLancamentosPanel tenantId={tenantId} />;
}
