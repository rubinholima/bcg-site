import * as XLSX from 'xlsx';
import { rowFingerprint } from './finance-import-hash.util';
import { asTextOrNull, normalizeMappingKey } from './finance-import-nd.util';
import { parseSpreadsheetDate } from './finance-import-date.util';
import { parseSpreadsheetMoney } from './finance-import-money.util';
import { classifyImportRow, transferDestinationUnknown } from './finance-import-classification.util';
import { validateImportAmounts, parseReconciliation } from './finance-import-validate.util';
import type { FinanceImportSemanticRow } from './finance-import.types';

export const PIVOT_PAGAMENTOS_ADAPTER_ID = 'omie_pivot_pagamentos_v1';

const HEADER_ALIASES: Record<string, string> = {
  'Minha Empresa (Nome Fantasia)': 'companyTradeName',
  'Minha Empresa (Razão Social)': 'companyLegalName',
  'Minha Empresa (CNPJ)': 'companyTaxId',
  'CNPJ/CPF': 'counterpartyTaxId',
  Fornecedor: 'counterpartyName',
  'Razão Social': 'counterpartyLegalName',
  Grupo: 'grupo',
  Categoria: 'category',
  'Conta Corrente': 'accountLabel',
  'Tipo da Conta Corrente': 'accountTypeLabel',
  Documento: 'documentType',
  Número: 'documentNumber',
  'Nota Fiscal': 'invoiceNumber',
  Boleto: 'boletoReference',
  'Código de Barras': 'barcode',
  Parcela: 'installmentLabel',
  Vencimento: 'dueDate',
  Previsão: 'scheduledDate',
  Emissão: 'issueDate',
  'Data de Pagto ou Recbto (completa)': 'settlementDate',
  'Data de Crédito ou Débito (No Extrato)': 'extractDate',
  'Valor da Conta': 'originalAmount',
  Juros: 'interest',
  Multa: 'penalty',
  Desconto: 'discount',
  Abatimento: 'abatement',
  Acréscimo: 'accrual',
  'Valor Pago': 'paidAmount',
  'A Pagar': 'remainingPayable',
  'Forma de Pagamento': 'paymentMethod',
  'Finalidade para Transferência': 'transferPurpose',
  'Conta Corrente para Transferência': 'transferDestAccount',
  Conciliado: 'reconciled',
  Observações: 'notes',
  'Nome do Meu Aplicativo': 'sourceApplication',
  Origem: 'sourceOrigin',
  'Baixa Incluída Por': 'settlementCreatedBy',
  'Baixa Alterada Por': 'settlementUpdatedBy',
  Tipo: 'tipoConta',
};

export function detectPivotPagamentosWorkbook(workbook: XLSX.WorkBook): boolean {
  return Boolean(workbook.SheetNames?.includes('Pagamentos'));
}

function rowToRecord(headers: string[], row: unknown[]): Record<string, unknown> {
  const rawByHeader: Record<string, unknown> = {};
  headers.forEach((h, i) => {
    if (!h) return;
    rawByHeader[h] = row[i] ?? '';
  });
  return rawByHeader;
}

function toSemantic(rawByHeader: Record<string, unknown>): Record<string, unknown> {
  const semantic: Record<string, unknown> = { rawHeaders: Object.keys(rawByHeader) };
  for (const [header, value] of Object.entries(rawByHeader)) {
    const key = HEADER_ALIASES[header];
    if (!key) continue;
    semantic[key] = value;
    if (key === 'issueDate' || key === 'dueDate' || key === 'scheduledDate' || key === 'settlementDate' || key === 'extractDate') {
      semantic[`${key}Normalized`] = parseSpreadsheetDate(value);
    }
    if (
      key === 'originalAmount' ||
      key === 'paidAmount' ||
      key === 'interest' ||
      key === 'penalty' ||
      key === 'discount' ||
      key === 'abatement' ||
      key === 'accrual' ||
      key === 'remainingPayable'
    ) {
      const parsed = parseSpreadsheetMoney(value);
      semantic[`${key}Parsed`] = parsed.amount ? parsed.amount.toNumber() : null;
      semantic[`${key}Direction`] = parsed.direction;
      semantic[`${key}Raw`] = parsed.raw;
    }
    if (key === 'companyTaxId' || key === 'counterpartyTaxId') {
      semantic[`${key}Normalized`] = normalizeTaxId(value);
    }
    if (key === 'barcode' || key === 'boletoReference') {
      semantic[`${key}Text`] = asTextOrNull(value);
    }
  }
  semantic.reconciliation = parseReconciliation(rawByHeader['Conciliado']);
  return semantic;
}

export function normalizeTaxId(v: unknown): string | null {
  const t = asTextOrNull(v);
  if (!t) return null;
  const digits = t.replace(/\D/g, '');
  return digits || null;
}

export function parsePivotPagamentosSheet(buffer: Buffer): FinanceImportSemanticRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  if (!detectPivotPagamentosWorkbook(workbook)) {
    throw new Error('Planilha Pagamentos não encontrada.');
  }
  const sheet = workbook.Sheets.Pagamentos;
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: true });
  if (matrix.length < 4) return [];

  const headers = (matrix[1] as unknown[]).map((h) => String(h ?? '').trim());
  const out: FinanceImportSemanticRow[] = [];

  for (let i = 3; i < matrix.length; i++) {
    const excelRow = i + 1;
    const row = matrix[i] as unknown[];
    if (!row || row.every((c) => c === '' || c == null)) continue;

    const rawByHeader = rowToRecord(headers, row);
    const semantic = toSemantic(rawByHeader);

    const classification = classifyImportRow({
      documentType: asTextOrNull(semantic.documentType),
      category: asTextOrNull(semantic.category),
      accountLabel: asTextOrNull(semantic.accountLabel),
      accountTypeLabel: asTextOrNull(semantic.accountTypeLabel),
      transferPurpose: asTextOrNull(semantic.transferPurpose),
      grupo: asTextOrNull(semantic.grupo),
      paidAmount: (semantic.paidAmountParsed as number | null) ?? null,
    });

    const amountCheck = validateImportAmounts({
      valorConta: rawByHeader['Valor da Conta'],
      juros: rawByHeader.Juros,
      multa: rawByHeader.Multa,
      desconto: rawByHeader.Desconto,
      abatimento: rawByHeader.Abatimento,
      acrescimo: rawByHeader.Acréscimo,
      valorPago: rawByHeader['Valor Pago'],
    });

    const warnings = [...amountCheck.warnings];
    const errors = [...amountCheck.errors];

    if (normalizeMappingKey(semantic.accountLabel) === 'permuta') {
      warnings.push('Conta PERMUTA — revisão manual obrigatória.');
    }

    if (transferDestinationUnknown(classification, semantic as never)) {
      warnings.push('Transferência interna sem conta destino explícita — revisão obrigatória.');
    }

    if (semantic.barcode && semantic.boletoReference) {
      const bc = normalizeMappingKey(semantic.barcode);
      const bl = normalizeMappingKey(semantic.boletoReference);
      if (bc && bl && bc !== bl) {
        warnings.push('Código de barras e referência de boleto são campos distintos — preservados.');
      }
    }

    let validationStatus = amountCheck.status;
    if (errors.length) validationStatus = 'invalid';
    else if (warnings.length && validationStatus === 'valid') validationStatus = 'warning';
    if (classification === 'OTHER_REVIEW' && validationStatus === 'valid') validationStatus = 'warning';

    const fingerprint = rowFingerprint({
      tax: String(semantic.companyTaxIdNormalized ?? ''),
      doc: String(semantic.documentNumber ?? ''),
      nf: String(semantic.invoiceNumber ?? ''),
      paid: String(semantic.paidAmountParsed ?? ''),
      settlement: String(semantic.settlementDateNormalized ?? ''),
      row: excelRow,
    });

    out.push({
      sourceRowNumber: excelRow,
      rawByHeader,
      semantic,
      classification,
      validationStatus,
      warnings,
      errors,
      duplicateState: 'none',
      fingerprint,
    });
  }

  return out;
}
