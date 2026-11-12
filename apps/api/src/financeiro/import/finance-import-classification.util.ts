import type { FinanceImportRowClassification } from './finance-import.types';
import { normalizeMappingKey } from './finance-import-nd.util';

const TRANSFER_CATEGORY = [
  'saida de transferencia',
  'entrada de transferencia',
  'transferencias entre contas',
  'despesas financeiras / bancos - transferencias entre contas',
];

export function classifyImportRow(input: {
  documentType: string | null;
  category: string | null;
  accountLabel: string | null;
  accountTypeLabel: string | null;
  transferPurpose: string | null;
  grupo: string | null;
  paidAmount: number | null;
}): FinanceImportRowClassification {
  const cat = normalizeMappingKey(input.category);
  const account = normalizeMappingKey(input.accountLabel);
  const accountType = normalizeMappingKey(input.accountTypeLabel);

  if (TRANSFER_CATEGORY.some((t) => cat.includes(t) || cat === t)) {
    return 'INTERNAL_TRANSFER';
  }

  if (account === 'permuta' || accountType.includes('mutuo')) {
    return 'OTHER_REVIEW';
  }

  const doc = normalizeMappingKey(input.documentType);
  if (doc === 'tarifa') {
    return 'DIRECT_DEBIT';
  }

  if (account.includes('cartao') && doc === 'tarifa') {
    return 'OTHER_REVIEW';
  }

  return 'PAYABLE_SETTLEMENT';
}

export function transferDestinationUnknown(classification: FinanceImportRowClassification, semantic: {
  accountLabel?: string | null;
  transferDestAccount?: string | null;
  category?: string | null;
}): boolean {
  if (classification !== 'INTERNAL_TRANSFER') return false;
  const cat = normalizeMappingKey(semantic.category);
  if (cat.includes('saida de transferencia') && !semantic.transferDestAccount) {
    return true;
  }
  return false;
}
