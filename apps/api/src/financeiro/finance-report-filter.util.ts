import type {
  FinanceReportDateBasis,
  FinanceReportDirection,
  FinanceReportFiltersInput,
  FinanceReportPeriodPreset,
  FinanceReportView,
} from './finance-report.types';

function splitCsv(v?: string): string[] | undefined {
  if (!v?.trim()) return undefined;
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseReportFiltersFromQuery(
  query: Record<string, string | undefined>,
  tenantIds: string[],
): FinanceReportFiltersInput {
  const page = query.page ? Math.max(1, parseInt(query.page, 10) || 1) : 1;
  const pageSize = query.pageSize
    ? Math.min(200, Math.max(1, parseInt(query.pageSize, 10) || 50))
    : 50;

  return {
    tenantIds,
    periodPreset: (query.periodPreset as FinanceReportPeriodPreset) || 'this_month',
    startDate: query.startDate?.trim(),
    endDate: query.endDate?.trim(),
    dateBasis: (query.dateBasis as FinanceReportDateBasis) || 'due',
    view: (query.view as FinanceReportView) || 'obligation',
    direction: (query.direction as FinanceReportDirection) || 'ambos',
    financeAccountIds: splitCsv(query.financeAccountIds),
    actualFinanceAccountIds: splitCsv(query.actualFinanceAccountIds),
    accountTypes: splitCsv(query.accountTypes),
    categoryIds: splitCsv(query.categoryIds),
    supplierId: query.supplierId?.trim(),
    customerId: query.customerId?.trim(),
    employeeId: query.employeeId?.trim(),
    documentType: query.documentType?.trim(),
    paymentMethodId: query.paymentMethodId?.trim(),
    statuses: splitCsv(query.statuses),
    reconciliationStatus: query.reconciliationStatus?.trim(),
    recordOrigin: query.recordOrigin?.trim(),
    sourceModule: query.sourceModule?.trim(),
    page,
    pageSize,
  };
}
