export type FinanceImportBatchStatus =
  | 'UPLOADED'
  | 'ANALYZED'
  | 'MAPPING_REQUIRED'
  | 'READY_FOR_REVIEW'
  | 'APPROVED'
  | 'IMPORTING'
  | 'IMPORTED'
  | 'FAILED'
  | 'CANCELLED';

export type FinanceImportRowClassification =
  | 'PAYABLE_SETTLEMENT'
  | 'DIRECT_DEBIT'
  | 'INTERNAL_TRANSFER'
  | 'OTHER_REVIEW';

export type FinanceImportValidationStatus = 'valid' | 'warning' | 'conflict' | 'invalid';

export type FinanceImportDuplicateState =
  | 'none'
  | 'exact_in_batch'
  | 'exact_file_reprocess'
  | 'possible_duplicate_cup360';

export type FinanceImportMappingKind =
  | 'company'
  | 'finance_account'
  | 'category'
  | 'subcategory'
  | 'counterparty'
  | 'payment_method'
  | 'document_type';

export const FINANCE_IMPORT_SOURCE_SPREADSHEET = 'xlsx_spreadsheet';

export type FinanceImportSemanticRow = {
  sourceRowNumber: number;
  rawByHeader: Record<string, unknown>;
  semantic: Record<string, unknown>;
  classification: FinanceImportRowClassification;
  validationStatus: FinanceImportValidationStatus;
  warnings: string[];
  errors: string[];
  duplicateState: FinanceImportDuplicateState;
  fingerprint: string;
};

export type FinanceImportSimulationSummary = {
  simulationVersion: number;
  mappingVersion: number;
  obligationsWouldCreate: number;
  settlementsWouldCreate: number;
  directDebitsWouldCreate: number;
  transfersWouldCreate: number;
  reconciledWouldCreate: number;
  notReconciledWouldCreate: number;
  skippedDuplicates: number;
  linkedExisting: number;
  excludedRows: number;
  unresolvedMappings: number;
  blockedRows: number;
  conflictRows: number;
  warningsCount: number;
  rowsByClassification: Record<string, number>;
  controlTotals?: {
    sourceOriginalTotal: number;
    sourceInterestTotal: number;
    sourcePenaltyTotal: number;
    sourcePaidTotal: number;
    projectedPaidTotal: number;
    mismatch: boolean;
    mismatchDelta: number;
  };
};

export type FinanceImportRowDecision = 'READY' | 'SKIP' | 'REVIEW';
export type FinanceImportDuplicateDecision = 'LINK_AND_SKIP' | 'IMPORT_SEPARATELY' | 'KEEP_FOR_REVIEW';

export type FinanceImportExecutionResult = {
  imported: number;
  linked: number;
  skipped: number;
  failed: number;
  pending: number;
  errors: Array<{ stagingRowId: string; message: string }>;
};
