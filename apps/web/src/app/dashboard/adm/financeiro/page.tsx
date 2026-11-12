"use client";

import { FinanceiroLancamentosPanel } from "./financeiro-lancamentos-panel";
import { FinanceOverviewKpis } from "./finance-overview-kpis";
import { useFinanceiroTenant } from "./financeiro-tenant-shell";

export default function AdmFinanceiroOverviewPage() {
  const { tenantId } = useFinanceiroTenant();

  if (!tenantId) return null;

  return (
    <div className="space-y-0">
      <FinanceOverviewKpis tenantId={tenantId} />
      <FinanceiroLancamentosPanel tenantId={tenantId} />
    </div>
  );
}
