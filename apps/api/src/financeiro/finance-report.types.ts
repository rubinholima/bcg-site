export type FinanceReportDateBasis =
  | 'competence'
  | 'due'
  | 'scheduled'
  | 'settlement'
  | 'issue';

export type FinanceReportView = 'obligation' | 'cash';

export type FinanceReportDirection = 'receitas' | 'despesas' | 'ambos';

export type FinanceReportMode = 'resumido' | 'detalhado';

export type FinanceReportPeriodPreset =
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_semester'
  | 'last_semester'
  | 'this_year'
  | 'last_year'
  | 'custom';

export interface FinanceReportFiltersInput {
  tenantIds: string[];
  periodPreset?: FinanceReportPeriodPreset;
  startDate?: string;
  endDate?: string;
  dateBasis: FinanceReportDateBasis;
  view: FinanceReportView;
  direction: FinanceReportDirection;
  mode?: FinanceReportMode;
  financeAccountIds?: string[];
  actualFinanceAccountIds?: string[];
  accountTypes?: string[];
  categoryIds?: string[];
  supplierId?: string;
  customerId?: string;
  employeeId?: string;
  documentType?: string;
  paymentMethodId?: string;
  statuses?: string[];
  reconciliationStatus?: string;
  recordOrigin?: string;
  sourceModule?: string;
  page?: number;
  pageSize?: number;
}

export interface FinanceReportSummaryKpis {
  receitas: number;
  despesas: number;
  resultado: number;
  contasAPagar: number;
  contasAReceber: number;
  vencidoAPagar: number;
  vencidoAReceber: number;
  pagoRecebidoNoPeriodo: number;
  juros: number;
  multas: number;
  descontos: number;
  pendenteCount: number;
  parcialCount: number;
  dateBasis: FinanceReportDateBasis;
  view: FinanceReportView;
  periodStart: string;
  periodEnd: string;
}
