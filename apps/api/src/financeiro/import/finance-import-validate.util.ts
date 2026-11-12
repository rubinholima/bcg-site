import { moneyDecimal } from '../finance-money.util';
import { parseSpreadsheetMoney, moneyEquationDelta } from './finance-import-money.util';
import type { FinanceImportValidationStatus } from './finance-import.types';
import { isNdValue } from './finance-import-nd.util';

export function validateImportAmounts(fields: {
  valorConta: unknown;
  juros: unknown;
  multa: unknown;
  desconto: unknown;
  abatimento: unknown;
  acrescimo: unknown;
  valorPago: unknown;
}): { status: FinanceImportValidationStatus; warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];

  const original = parseSpreadsheetMoney(fields.valorConta).amount;
  const paid = parseSpreadsheetMoney(fields.valorPago).amount;
  const interest = parseSpreadsheetMoney(fields.juros).amount ?? moneyDecimal(0);
  const penalty = parseSpreadsheetMoney(fields.multa).amount ?? moneyDecimal(0);
  const discount = parseSpreadsheetMoney(fields.desconto).amount ?? moneyDecimal(0);
  const abatement = parseSpreadsheetMoney(fields.abatimento).amount ?? moneyDecimal(0);
  const accrual = parseSpreadsheetMoney(fields.acrescimo).amount ?? moneyDecimal(0);

  if (original == null && paid == null) {
    errors.push('Sem valor original nem valor pago.');
    return { status: 'invalid', warnings, errors };
  }

  if (original != null && paid != null) {
    const delta = moneyEquationDelta({
      original,
      interest,
      penalty,
      discount,
      abatement,
      accrual,
      paid,
    });
    if (delta != null && Math.abs(delta) > 0.05) {
      warnings.push(`Equação financeira diverge em ${delta.toFixed(2)} (não ajustado automaticamente).`);
    }
  }

  if (!isNdValue(fields.juros) && interest.equals(0) && String(fields.juros).trim() !== '0') {
    warnings.push('Juros presente mas não parseado.');
  }

  return {
    status: errors.length ? 'invalid' : warnings.length ? 'warning' : 'valid',
    warnings,
    errors,
  };
}

export function parseReconciliation(conciliado: unknown): 'reconciled' | 'not_reconciled' | 'unknown' {
  const s = String(conciliado ?? '').trim().toLowerCase();
  if (!s || /^n\/d$/i.test(s)) return 'unknown';
  if (s === 'sim' || s === 's' || s === 'yes' || s === 'true') return 'reconciled';
  if (s === 'nao' || s === 'não' || s === 'n' || s === 'no' || s === 'false') return 'not_reconciled';
  return 'unknown';
}
