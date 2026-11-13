export type FinanceOmieTituloTipo = 'pagar' | 'receber';

export type FinanceOmieSyncType = 'ap' | 'ar' | 'both';

export type FinanceOmieSyncBatchStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'COMPLETED_WITH_WARNINGS'
  | 'FAILED';

export type FinanceOmieReconciliationState =
  | 'UNMATCHED'
  | 'POSSIBLE_MATCH'
  | 'LINKED'
  | 'MATCHED'
  | 'DIFFERENCE'
  | 'KEEP_SEPARATE';

export type FinanceOmieMatchLevel =
  | 'CONFIRMED_IDENTITY'
  | 'STRONG_CANDIDATE'
  | 'POSSIBLE_MATCH'
  | 'NO_MATCH'
  | 'CONFLICT';

export type FinanceOmieReconcileDecision = 'LINK' | 'KEEP_SEPARATE' | 'REVIEW_LATER';

export type FinanceOmieNormalizedTitulo = {
  omieLancamentoId: string | null;
  omieIntegracaoCode: string | null;
  supplierOmieId: string | null;
  customerOmieId: string | null;
  identityWarnings?: string[];
  counterpartyName: string | null;
  counterpartyTaxId: string | null;
  documentNumber: string | null;
  reference: string | null;
  issueDate: string | null;
  dueDate: string | null;
  competenceDate: string | null;
  originalAmount: number | null;
  interestAmount: number | null;
  penaltyAmount: number | null;
  discountAmount: number | null;
  paidAmount: number | null;
  statusOmie: string | null;
  settlementDate: string | null;
  accountLabel: string | null;
  accountOmieId: string | null;
  paymentMethodLabel: string | null;
  categoryLabel: string | null;
  installment: string | null;
  notes: string | null;
  reconciliationConciliado: string | null;
};

export type FinanceOmieConnectionStatusDto = {
  configured: boolean;
  ok?: boolean;
  message?: string;
  lastSuccessfulSyncAt: string | null;
  lastSyncAttemptAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
};
