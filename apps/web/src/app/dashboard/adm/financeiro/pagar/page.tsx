"use client";

import { useState } from "react";
import { FinanceOperationalForm } from "../finance-operational-form";
import { FinanceiroLancamentosPanel } from "../financeiro-lancamentos-panel";
import { useFinanceiroTenant } from "../financeiro-tenant-shell";

export default function FinanceiroPagarPage() {
  const { tenantId } = useFinanceiroTenant();
  const [refreshKey, setRefreshKey] = useState(0);

  if (!tenantId) return null;

  return (
    <div className="space-y-6">
      <FinanceOperationalForm
        tenantId={tenantId}
        tipo="pagar"
        onCreated={() => setRefreshKey((k) => k + 1)}
      />
      <FinanceiroLancamentosPanel
        key={`${tenantId}-pagar-${refreshKey}`}
        tenantId={tenantId}
        defaultTipo="pagar"
      />
    </div>
  );
}
