import { Prisma } from '@prisma/client';
import { sha256Buffer, rowFingerprint } from './finance-import-hash.util';
import { isNdValue, asTextOrNull, normalizeMappingKey } from './finance-import-nd.util';
import { parseSpreadsheetMoney, moneyEquationDelta } from './finance-import-money.util';
import { excelSerialToIso, parseSpreadsheetDate } from './finance-import-date.util';
import { classifyImportRow } from './finance-import-classification.util';
import { validateImportAmounts, parseReconciliation } from './finance-import-validate.util';
import { detectExactFileReprocess, fuzzyAutoMergeAllowed } from './finance-import-duplicate.util';
import { collectMappingCandidates, mappingKindBlockedForAutoConfirm } from './finance-import-mapping.util';
import { FinanceImportSimulationService } from './finance-import-simulation.service';
import { FinanceImportExecutionService } from './finance-import-execution.service';
import * as fs from 'fs';
import { parsePivotPagamentosSheet } from './finance-import-pivot-pagamentos.parser';

describe('finance-import hash', () => {
  it('detecta mesmo arquivo por SHA-256', () => {
    const a = sha256Buffer(Buffer.from('abc'));
    const b = sha256Buffer(Buffer.from('abc'));
    expect(a).toBe(b);
    expect(detectExactFileReprocess(a, b)).toBe(true);
  });
});

describe('finance-import ND e texto', () => {
  it('trata N/D como ausente', () => {
    expect(isNdValue('N/D')).toBe(true);
    expect(asTextOrNull('N/D')).toBeNull();
    expect(asTextOrNull('Sicoob')).toBe('Sicoob');
  });

  it('não converte N/D em zero', () => {
    const m = parseSpreadsheetMoney('N/D');
    expect(m.amount).toBeNull();
  });
});

describe('finance-import money', () => {
  it('normaliza saída negativa BRL', () => {
    const m = parseSpreadsheetMoney('-R$ 1,000.00');
    expect(m.direction).toBe('out');
    expect(m.amount?.toNumber()).toBe(1000);
  });

  it('valida equação juros/multa/desconto', () => {
    const original = new Prisma.Decimal(100);
    const paid = new Prisma.Decimal(110);
    const delta = moneyEquationDelta({
      original,
      interest: new Prisma.Decimal(10),
      penalty: new Prisma.Decimal(0),
      discount: new Prisma.Decimal(0),
      abatement: new Prisma.Decimal(0),
      accrual: new Prisma.Decimal(0),
      paid,
    });
    expect(delta).toBe(0);
  });
});

describe('finance-import dates', () => {
  it('converte serial Excel', () => {
    const iso = excelSerialToIso(45292);
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('não infere competência', () => {
    expect(parseSpreadsheetDate('N/D')).toBeNull();
  });
});

describe('finance-import classification', () => {
  it('classifica transferência interna', () => {
    expect(
      classifyImportRow({
        documentType: 'Outros',
        category: 'Saída de Transferência',
        accountLabel: 'Sicoob',
        accountTypeLabel: 'Conta Corrente',
        transferPurpose: null,
        grupo: null,
        paidAmount: 400,
      }),
    ).toBe('INTERNAL_TRANSFER');
  });

  it('classifica débito direto (Tarifa)', () => {
    expect(
      classifyImportRow({
        documentType: 'Tarifa',
        category: 'Tarifas',
        accountLabel: 'Omie.CASH',
        accountTypeLabel: 'Conta Corrente',
        transferPurpose: null,
        grupo: null,
        paidAmount: 10,
      }),
    ).toBe('DIRECT_DEBIT');
  });

  it('marca PERMUTA para revisão', () => {
    expect(
      classifyImportRow({
        documentType: 'Outros',
        category: 'X',
        accountLabel: 'PERMUTA',
        accountTypeLabel: 'Mútuo',
        transferPurpose: null,
        grupo: null,
        paidAmount: 1,
      }),
    ).toBe('OTHER_REVIEW');
  });
});

describe('finance-import reconciliation', () => {
  it('preserva conciliação separada', () => {
    expect(parseReconciliation('Sim')).toBe('reconciled');
    expect(parseReconciliation('Não')).toBe('not_reconciled');
  });
});

describe('finance-import mapping', () => {
  it('exige revisão para conta e categoria', () => {
    expect(mappingKindBlockedForAutoConfirm('finance_account')).toBe(true);
    expect(mappingKindBlockedForAutoConfirm('company')).toBe(true);
  });

  it('sugestão não é aprovação (sem fuzzy merge)', () => {
    expect(fuzzyAutoMergeAllowed()).toBe(false);
  });

  it('deduplica mapeamentos por valor fonte', () => {
    const candidates = collectMappingCandidates([
      { accountLabel: 'Sicoob', companyTaxId: '29.342.671/0001-12' },
      { accountLabel: 'Sicoob', companyTaxId: '29.342.671/0001-12' },
    ]);
    expect(candidates.filter((c) => c.mappingKind === 'finance_account')).toHaveLength(1);
  });
});

describe('finance-import simulation', () => {
  it('não grava registros canônicos', async () => {
    const svc = new FinanceImportSimulationService();
    const summary = svc.simulate(
      [
        { rowClassification: 'PAYABLE_SETTLEMENT', validationStatus: 'valid', duplicateState: 'none' },
        { rowClassification: 'INTERNAL_TRANSFER', validationStatus: 'valid', duplicateState: 'none' },
      ],
      0,
    );
    expect(summary.obligationsWouldCreate).toBe(1);
    expect(summary.transfersWouldCreate).toBe(1);
  });
});

describe('finance-import execution foundation', () => {
  it('bloqueia execução canônica', async () => {
    const prisma = {
      financeImportBatch: {
        findFirst: jest.fn().mockResolvedValue({ id: 'b1', status: 'APPROVED' }),
      },
    };
    const audit = { log: jest.fn() };
    const svc = new FinanceImportExecutionService(prisma as never, audit as never);
    await expect(
      svc.executeBatch('t1', 'b1', { allowCanonicalWrite: false }),
    ).rejects.toThrow(/desabilitada/);
  });
});

describe('finance-import allocation / document separation', () => {
  it('validação marca divergência sem ajustar', () => {
    const res = validateImportAmounts({
      valorConta: 'R$ 100,00',
      juros: 'R$ 0,00',
      multa: 'R$ 0,00',
      desconto: 'R$ 0,00',
      abatimento: 'R$ 0,00',
      acrescimo: 'R$ 0,00',
      valorPago: 'R$ 150,00',
    });
    expect(res.warnings.length).toBeGreaterThan(0);
  });
});

describe('finance-import pivot parser (fixture opcional)', () => {
  const pivotPath = 'C:/Users/ATRIUM STREAM/Downloads/pivot.xlsx';
  const hasPivot = fs.existsSync(pivotPath);

  (hasPivot ? it : it.skip)('analisa pivot.xlsx sem importar canônico', () => {
    const buf = fs.readFileSync(pivotPath);
    const rows = parsePivotPagamentosSheet(buf);
    expect(rows.length).toBeGreaterThan(600);
    const transfers = rows.filter((r) => r.classification === 'INTERNAL_TRANSFER');
    const debits = rows.filter((r) => r.classification === 'DIRECT_DEBIT');
    expect(transfers.length).toBeGreaterThanOrEqual(3);
    expect(debits.length).toBeGreaterThanOrEqual(200);
    expect(rows.every((r) => r.rawByHeader && r.semantic)).toBe(true);
  });
});

describe('FinanceImportBatchService idempotency fingerprint', () => {
  it('protege fingerprint de linha', () => {
    const fp1 = rowFingerprint({ a: '1', b: '2' });
    const fp2 = rowFingerprint({ a: '1', b: '3' });
    expect(fp1).not.toBe(fp2);
  });
});
