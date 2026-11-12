"use client";

import { FinanceReportsPanel } from "../finance-reports-panel";
import { useFinanceiroTenant } from "../financeiro-tenant-shell";

export default function FinanceiroRelatoriosPage() {
  const { tenantId } = useFinanceiroTenant();
  if (!tenantId) return null;
  return <FinanceReportsPanel tenantId={tenantId} />;
}
