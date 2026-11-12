import { FinanceImportSimulationService } from './finance-import-simulation.service';
import { FinanceImportExecutionService } from './finance-import-execution.service';
import {
  assertCanonicalImportAllowed,
  isPivotWorkbookBatch,
  pivotSafetyLockActive,
} from './finance-import-pivot-safety.util';
import { aggregateControlTotals } from './finance-import-control-totals.util';
import {
  batchReadiness,
  isMappingResolved,
  isPermutaBlocked,
  mappingKey,
  rowStructuralConflicts,
} from './finance-import-readiness.util';
import { buildBulkMappingSections, buildDuplicateReviewItem } from './finance-import-review.util';
import {
  buildLancamentoPayload,
  shouldSkipExecution,
  settlementIdempotencyKey,
} from './finance-import-execution.engine';
import { collectMappingCandidates } from './finance-import-mapping.util';

describe('Prompt 063 — pivot safety', () => {
  it('pivot.xlsx permanece bloqueado', () => {
    expect(isPivotWorkbookBatch({ originalFilename: 'pivot.xlsx' })).toBe(true);
    expect(pivotSafetyLockActive({ originalFilename: 'pivot.xlsx', sourceType: 'omie_pivot_pagamentos_v1' })).toBe(
      true,
    );
    expect(() =>
      assertCanonicalImportAllowed(
        { originalFilename: 'pivot.xlsx', sourceType: 'omie_pivot_pagamentos_v1' },
        { allowCanonicalWrite: true },
      ),
    ).toThrow(/bloqueada/);
  });

  it('allowCanonicalWrite false bloqueia execução', () => {
    expect(() =>
      assertCanonicalImportAllowed({ originalFilename: 'outro.xlsx', sourceType: 'xlsx_unknown' }, {}),
    ).toThrow(/desabilitada/);
  });
});

describe('Prompt 063 — bulk mapping', () => {
  it('agrega contagem de linhas por conta', () => {
    const sections = buildBulkMappingSections(
      [
        {
          id: 'm1',
          mappingKind: 'finance_account',
          sourceValue: 'Sicoob',
          sourceValueNormalized: 'sicoob',
          action: 'review_required',
          targetId: null,
          confirmed: false,
        },
      ],
      [{ normalizedValues: { accountLabel: 'Sicoob', paidAmount: 100 } }, { normalizedValues: { accountLabel: 'Sicoob', paidAmount: 50 } }],
    );
    expect(sections[0].items[0].affectedRows).toBe(2);
    expect(sections[0].items[0].financialTotal).toBe(150);
  });

  it('collectMappingCandidates deduplica', () => {
    const c = collectMappingCandidates([{ accountLabel: 'Sicoob' }, { accountLabel: 'Sicoob' }]);
    expect(c.filter((x) => x.mappingKind === 'finance_account')).toHaveLength(1);
  });
});

describe('Prompt 063 — readiness and PERMUTA', () => {
  it('PERMUTA não resolvida bloqueia', () => {
    const map = new Map<string, never>();
    expect(
      isPermutaBlocked({ accountLabel: 'PERMUTA' }, 'OTHER_REVIEW', map as never),
    ).toBe(true);
  });

  it('empresa não mapeada gera conflito', () => {
    const map = new Map();
    const codes = rowStructuralConflicts(
      {
        id: 'r1',
        validationStatus: 'valid',
        rowClassification: 'PAYABLE_SETTLEMENT',
        duplicateState: 'none',
        duplicateDecision: null,
        rowDecision: null,
        normalizedValues: { companyTaxIdNormalized: '123', accountLabel: 'Sicoob' },
        possibleDuplicateLancamentoId: null,
      },
      map,
    );
    expect(codes).toContain('company_not_mapped');
    expect(codes).toContain('account_not_mapped');
  });

  it('mapeamento resolvido', () => {
    expect(
      isMappingResolved({
        mappingKind: 'finance_account',
        sourceValueNormalized: 'sicoob',
        action: 'map_existing',
        confirmed: true,
        targetId: 'acc1',
      }),
    ).toBe(true);
  });
});

describe('Prompt 063 — duplicates', () => {
  it('LINK_AND_SKIP pula execução', () => {
    const skip = shouldSkipExecution({
      stagingRowId: 's1',
      batchId: 'b1',
      tenantId: 't1',
      sheetName: 'Pagamentos',
      sourceRowNumber: 1,
      fingerprint: 'fp',
      classification: 'PAYABLE_SETTLEMENT',
      duplicateState: 'possible_duplicate_cup360',
      duplicateDecision: 'LINK_AND_SKIP',
      rowDecision: null,
      validationStatus: 'valid',
      normalizedValues: {},
      possibleDuplicateLancamentoId: 'l1',
    });
    expect(skip).toEqual({ skip: true, reason: 'link_and_skip' });
  });

  it('duplicidade confirmada não reimporta', () => {
    const skip = shouldSkipExecution({
      stagingRowId: 's1',
      batchId: 'b1',
      tenantId: 't1',
      sheetName: 'Pagamentos',
      sourceRowNumber: 1,
      fingerprint: 'fp',
      classification: 'PAYABLE_SETTLEMENT',
      duplicateState: 'exact_file_reprocess',
      duplicateDecision: null,
      rowDecision: null,
      validationStatus: 'valid',
      normalizedValues: {},
      possibleDuplicateLancamentoId: null,
    });
    expect(skip).toEqual({ skip: true, reason: 'confirmed_duplicate' });
  });

  it('side-by-side duplicate review', () => {
    const item = buildDuplicateReviewItem(
      {
        id: 'r1',
        sourceRowNumber: 10,
        sheetName: 'Pagamentos',
        duplicateState: 'exact_file_reprocess',
        duplicateFlagReason: null,
        duplicateDecision: null,
        normalizedValues: { counterpartyName: 'A', paidAmount: 100 },
        possibleDuplicateLancamentoId: 'l1',
      },
      {
        id: 'l1',
        valor: 100,
        contraparte: 'A',
        dueDate: new Date(),
        settledAt: new Date(),
        referencia: 'DOC',
        recordOrigin: 'manual_cup360',
      },
    );
    expect(item.flagReason).toMatch(/importado|confirmada/i);
    expect(item.existing?.recordId).toBe('l1');
  });
});

describe('Prompt 063 — simulation versioning', () => {
  it('simulação não grava canônico (serviço puro)', () => {
    const svc = new FinanceImportSimulationService();
    const summary = svc.simulate(
      [{ rowClassification: 'PAYABLE_SETTLEMENT', validationStatus: 'valid', duplicateState: 'none' }],
      0,
      1,
      2,
      [
        {
          mappingKind: 'company',
          sourceValueNormalized: '123',
          action: 'map_existing',
          confirmed: true,
          targetId: 't1',
        },
      ],
    );
    expect(summary.simulationVersion).toBe(2);
    expect(summary.mappingVersion).toBe(1);
    expect(summary.obligationsWouldCreate).toBe(1);
  });
});

describe('Prompt 063 — control totals', () => {
  it('soma totais da fonte', () => {
    const t = aggregateControlTotals([
      {
        validationStatus: 'valid',
        rowDecision: null,
        normalizedValues: { valorPago: '-R$ 100,00', valorConta: 'R$ 100,00' },
      },
    ]);
    expect(t.sourcePaidTotal).toBeGreaterThan(0);
    expect(t.mismatch).toBe(false);
  });
});

describe('Prompt 063 — execution engine', () => {
  it('idempotency key determinístico', () => {
    expect(settlementIdempotencyKey('b1', 'r1')).toBe('finance_import:b1:r1');
  });

  it('payload histórico AP pago', () => {
    const map = new Map();
    map.set(mappingKey('finance_account', 'sicoob'), {
      mappingKind: 'finance_account',
      sourceValueNormalized: 'sicoob',
      action: 'map_existing',
      confirmed: true,
      targetId: 'acc',
    });
    const payload = buildLancamentoPayload(
      {
        stagingRowId: 'r1',
        batchId: 'b1',
        tenantId: 't1',
        sheetName: 'Pagamentos',
        sourceRowNumber: 5,
        fingerprint: 'fp',
        classification: 'PAYABLE_SETTLEMENT',
        duplicateState: 'none',
        duplicateDecision: null,
        rowDecision: 'READY',
        validationStatus: 'valid',
        normalizedValues: {
          accountLabel: 'Sicoob',
          valorPago: '-R$ 200,00',
          valorConta: 'R$ 200,00',
          paymentDate: '2024-01-10',
          conciliado: 'Não',
        },
        possibleDuplicateLancamentoId: null,
      },
      map,
    );
    expect(payload?.status).toBe('pago');
    expect(payload?.reconciliationStatus).toBe('not_reconciled');
  });
});

describe('Prompt 063 — execution service guards', () => {
  it('bloqueia sem allowCanonicalWrite', async () => {
    const prisma = {
      financeImportBatch: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'b1',
          status: 'APPROVED',
          executionApprovedAt: new Date(),
          simulationStale: false,
          originalFilename: 'test.xlsx',
          sourceType: 'xlsx_unknown',
        }),
      },
    };
    const audit = { log: jest.fn() };
    const svc = new FinanceImportExecutionService(prisma as never, audit as never);
    await expect(svc.executeBatch('t1', 'b1', { allowCanonicalWrite: false })).rejects.toThrow(/desabilitada/);
  });

  it('cross-tenant: findFirst usa tenantId', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const prisma = { financeImportBatch: { findFirst } };
    const svc = new FinanceImportExecutionService(prisma as never, { log: jest.fn() } as never);
    await expect(
      svc.executeBatch('tenant-a', 'b1', { allowCanonicalWrite: true }),
    ).rejects.toThrow(/não encontrado/);
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'b1', tenantId: 'tenant-a' } });
  });
});

describe('Prompt 063 — batch readiness rule', () => {
  it('simulation stale bloqueia import', () => {
    const r = batchReadiness({
      mappings: [],
      rows: [],
      simulationStale: true,
      simulationSummary: { ok: true },
      controlTotalsMismatch: false,
    });
    expect(r.readyForImport).toBe(false);
    expect(r.blockingReasons).toContain('simulation_stale_or_missing');
  });
});
