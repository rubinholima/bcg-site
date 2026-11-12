import type { FinanceImportDuplicateState } from './finance-import.types';

export function detectExactFileReprocess(
  existingBatchFileHash: string | null | undefined,
  incomingHash: string,
): boolean {
  return Boolean(existingBatchFileHash && existingBatchFileHash === incomingHash);
}

export function classifyPossibleDuplicate(
  existingLink: { provider: string; externalId: string } | null,
): FinanceImportDuplicateState {
  if (!existingLink) return 'none';
  if (existingLink.provider === 'omie') {
    return 'possible_duplicate_cup360';
  }
  if (existingLink.provider === 'spreadsheet_import') {
    return 'exact_file_reprocess';
  }
  return 'possible_duplicate_cup360';
}

export function fuzzyAutoMergeAllowed(): false {
  return false;
}
