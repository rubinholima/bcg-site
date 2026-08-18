export const COMPRAS_REPORT_SCOPES = [
  { value: 'geral', label: 'Geral — movimentos, requisições e compras' },
  { value: 'entradas', label: 'Entradas de estoque' },
  { value: 'saidas', label: 'Saídas de estoque' },
  { value: 'saidas_departamento', label: 'Saídas por departamento' },
  { value: 'cozinha', label: 'Saídas / itens — cozinha' },
  { value: 'requisicoes', label: 'Requisições de compra' },
  { value: 'compras', label: 'Pedidos de compra' },
] as const;

export type ComprasReportScope = (typeof COMPRAS_REPORT_SCOPES)[number]['value'];

export type ComprasEstoqueReport = {
  tenant: { id: string; name: string; slug: string };
  scope: ComprasReportScope;
  period: { from: string | null; to: string | null };
  filters: { departmentName: string | null; inventoryKind: string | null };
  summary: {
    movementCount: number;
    entriesCount: number;
    exitsCount: number;
    requisitionCount: number;
    orderCount: number;
    totalEntryQty: number;
    totalExitQty: number;
  };
  movements: Array<{
    id: string;
    date: string;
    direction: string;
    type: string;
    typeLabel: string;
    productName: string;
    sku: string | null;
    unit: string | null;
    inventoryKind: string | null;
    inventoryKindLabel: string;
    quantity: number;
    unitPrice: number | null;
    totalValue: number | null;
    departmentName: string | null;
    referenceLabel: string | null;
    notes: string | null;
  }>;
  requisitions: Array<{
    id: string;
    date: string;
    departmentName: string | null;
    requestedByName: string | null;
    status: string;
    statusLabel: string;
    requestType: string | null;
    totalEstimated: number | null;
    approvedTotal: number | null;
    itemsSummary: string;
    justification: string | null;
  }>;
  orders: Array<{
    id: string;
    date: string;
    orderNumber: string | null;
    status: string;
    statusLabel: string;
    supplierName: string;
    totalAmount: number | null;
    itemsSummary: string;
    requisitionDepartment: string | null;
  }>;
};

export function scopeLabel(scope: string): string {
  return COMPRAS_REPORT_SCOPES.find((s) => s.value === scope)?.label ?? scope;
}

export function defaultReportPeriod(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}
