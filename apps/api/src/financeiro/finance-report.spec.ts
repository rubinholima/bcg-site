import { Prisma } from '@prisma/client';
import { resolveReportPeriod } from './finance-report-period.util';
import { parseReportFiltersFromQuery } from './finance-report-filter.util';
import {
  LEGACY_CATEGORY_LABEL,
  baseOperatingWhere,
  legacyCategoryLabel,
  obligationReportAmount,
  remainingBalanceNum,
  categoryKeyForBreakdown,
} from './finance-report-query.util';
import { FinanceReportService } from './finance-report.service';
import { computeSettlementFinal, moneyDecimal, moneyToNumber, obligationAmount } from './finance-money.util';

describe('resolveReportPeriod', () => {
  it('usa intervalo custom', () => {
    const { start, end } = resolveReportPeriod('custom', '2026-01-01', '2026-01-31');
    expect(start.toISOString().slice(0, 10)).toBe('2026-01-01');
    expect(end.toISOString().slice(0, 10)).toBe('2026-01-31');
  });

  it('default this_month cobre mês corrente', () => {
    const now = new Date();
    const { start } = resolveReportPeriod('this_month', undefined, undefined);
    expect(start.getUTCMonth()).toBe(now.getUTCMonth());
  });
});

describe('finance-report filters and semantics', () => {
  it('parseia arrays e paginação', () => {
    const f = parseReportFiltersFromQuery(
      {
        periodPreset: 'this_week',
        dateBasis: 'competence',
        view: 'cash',
        direction: 'despesas',
        financeAccountIds: 'a,b',
        page: '2',
        pageSize: '25',
      },
      ['t1'],
    );
    expect(f.tenantIds).toEqual(['t1']);
    expect(f.financeAccountIds).toEqual(['a', 'b']);
    expect(f.page).toBe(2);
    expect(f.pageSize).toBe(25);
    expect(f.dateBasis).toBe('competence');
    expect(f.view).toBe('cash');
  });

  it('baseOperatingWhere exclui transferência interna', () => {
    const where = baseOperatingWhere({
      tenantIds: ['t1'],
      dateBasis: 'due',
      view: 'obligation',
      direction: 'ambos',
    });
    expect(where.transactionKind).toEqual({ not: 'internal_transfer' });
  });

  it('obligationReportAmount com rateio não duplica documento', () => {
    const lanc = {
      originalAmount: new Prisma.Decimal(80),
      valor: new Prisma.Decimal(80),
      financeCategoryId: null,
      allocationLines: [
        { financeCategoryId: 'c1', amount: new Prisma.Decimal(30) },
        { financeCategoryId: 'c2', amount: new Prisma.Decimal(50) },
      ],
    };
    expect(obligationReportAmount(lanc)).toBe(80);
    expect(obligationReportAmount(lanc, ['c1'])).toBe(30);
    expect(obligationReportAmount(lanc, ['c2'])).toBe(50);
    expect(obligationReportAmount(lanc, ['c1', 'c2'])).toBe(80);
  });

  it('legado categoria preserva texto', () => {
    expect(legacyCategoryLabel('Antiga NF')).toBe('Antiga NF');
    expect(legacyCategoryLabel('')).toBe(LEGACY_CATEGORY_LABEL);
    expect(categoryKeyForBreakdown(null, 'Legado X')).toBe('legacy:Legado X');
  });

  it('saldo parcial reporta obrigação x caixa', () => {
    const rem = remainingBalanceNum({
      originalAmount: new Prisma.Decimal(1000),
      valor: new Prisma.Decimal(1000),
      amountSettledTotal: new Prisma.Decimal(600),
    });
    expect(rem).toBe(400);
    const ob = moneyToNumber(obligationAmount({ originalAmount: new Prisma.Decimal(1000), valor: new Prisma.Decimal(1000) }));
    expect(ob).toBe(1000);
    const cash = moneyToNumber(
      computeSettlementFinal({ amountSettled: moneyDecimal(600) }),
    );
    expect(cash).toBe(600);
  });

  it('liquidação ≠ conciliação nos filtros', () => {
    const where = baseOperatingWhere({
      tenantIds: ['t1'],
      dateBasis: 'due',
      view: 'obligation',
      direction: 'ambos',
      statuses: ['pago'],
      reconciliationStatus: 'not_reconciled',
    });
    expect(where.status).toEqual({ in: ['pago'] });
    expect(where.reconciliationStatus).toBe('not_reconciled');
  });

  it('direção receitas/despesas', () => {
    const rec = baseOperatingWhere({
      tenantIds: ['t1'],
      dateBasis: 'due',
      view: 'obligation',
      direction: 'receitas',
    });
    expect(rec.tipo).toBe('receber');
    const pay = baseOperatingWhere({
      tenantIds: ['t1'],
      dateBasis: 'due',
      view: 'obligation',
      direction: 'despesas',
    });
    expect(pay.tipo).toBe('pagar');
  });
});

describe('FinanceReportService — isolamento tenant (mock)', () => {
  it('exportCsv inclui BOM UTF-8', async () => {
    const prisma = {
      financeiroLancamento: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      financeSettlement: { aggregate: jest.fn() },
    };
    const audit = { log: jest.fn() };
    const svc = new FinanceReportService(prisma as never, audit as never);
    const csv = await svc.exportCsv({
      tenantIds: ['t1'],
      dateBasis: 'due',
      view: 'obligation',
      direction: 'ambos',
      periodPreset: 'this_month',
    });
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Empresa');
  });

  it('pagamento fatura cartão não entra em operating (cartão = despesa na compra)', () => {
    const kinds = ['operating_expense', 'internal_transfer'];
    expect(kinds).not.toContain('card_statement_only');
  });
});
