import { Prisma } from '@prisma/client';
import {
  computeSettlementFinal,
  moneyDecimal,
  moneyEquals,
  obligationAmount,
  splitInstallmentAmounts,
} from './finance-money.util';
import { FinanceAllocationService } from './finance-allocation.service';
import { FinanceSettlementService } from './finance-settlement.service';
import { FinanceTransferService } from './finance-transfer.service';
import { FinancePayrollDeductionService } from './finance-payroll-deduction.service';

describe('finance-money.util', () => {
  it('calcula valor final com juros/multa/desconto', () => {
    const final = computeSettlementFinal({
      amountSettled: moneyDecimal(1000),
      interestAmount: moneyDecimal(10),
      penaltyAmount: moneyDecimal(20),
      discountAmount: moneyDecimal(5),
      abatementAmount: moneyDecimal(0),
      otherAdjustmentAmount: moneyDecimal(0),
    });
    expect(final.toNumber()).toBe(1025);
  });

  it('divide parcelas com centavos determinísticos', () => {
    const parts = splitInstallmentAmounts(moneyDecimal(100), 3);
    const sum = parts.reduce((a, b) => a.add(b), moneyDecimal(0));
    expect(moneyEquals(sum, moneyDecimal(100))).toBe(true);
    expect(parts).toHaveLength(3);
  });
});

describe('FinanceAllocationService', () => {
  it('rejeita rateio que não fecha com o valor do documento', async () => {
    const prisma = {
      financeiroLancamento: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'l1',
          tenantId: 't1',
          valor: new Prisma.Decimal(80),
          originalAmount: new Prisma.Decimal(80),
        }),
      },
      financeAllocationLine: { deleteMany: jest.fn(), create: jest.fn() },
      $transaction: jest.fn((fn) => fn(prisma)),
    };
    const audit = { log: jest.fn() };
    const service = new FinanceAllocationService(prisma as never, audit as never);
    await expect(
      service.replaceLines('t1', 'l1', [{ amount: 79.99 }]),
    ).rejects.toThrow('Rateio deve totalizar');
  });
});

describe('FinanceSettlementService — legado', () => {
  it('identifica baixa legada sem settlements', () => {
    const svc = new FinanceSettlementService({} as never, {} as never, {} as never, {} as never, {} as never);
    const info = svc.legacyInfo({
      status: 'pago',
      settledAt: new Date(),
      settlements: [],
    });
    expect(info.isLegacySettled).toBe(true);
    expect(info.label).toBe('Baixa legada');
  });
});

describe('obligationAmount', () => {
  it('preserva originalAmount', () => {
    expect(
      obligationAmount({
        originalAmount: new Prisma.Decimal(500),
        valor: new Prisma.Decimal(1),
      }).toNumber(),
    ).toBe(500);
  });
});

describe('FinanceTransferService', () => {
  it('retorna transferência existente por idempotencyKey', async () => {
    const existing = { id: 't1', transferGroupId: 'key-1' };
    const prisma = {
      financeInternalTransfer: { findFirst: jest.fn().mockResolvedValue(existing) },
    };
    const svc = new FinanceTransferService(prisma as never, { log: jest.fn() } as never);
    const out = await svc.createInternalTransfer(
      'tenant',
      {
        sourceAccountId: 'a',
        destAccountId: 'b',
        amount: 100,
        transferDate: '2026-01-01',
        idempotencyKey: 'key-1',
      },
      'u1',
    );
    expect(out).toBe(existing);
  });

  it('rejeita origem igual ao destino', async () => {
    const prisma = { financeInternalTransfer: { findFirst: jest.fn() } };
    const svc = new FinanceTransferService(prisma as never, { log: jest.fn() } as never);
    await expect(
      svc.createInternalTransfer(
        'tenant',
        {
          sourceAccountId: 'same',
          destAccountId: 'same',
          amount: 10,
          transferDate: '2026-01-01',
          idempotencyKey: 'k',
        },
        null,
      ),
    ).rejects.toThrow('diferentes');
  });
});

describe('FinancePayrollDeductionService — idempotência', () => {
  it('retorna link existente sem criar duplicata', async () => {
    const existing = { id: 'link-1', idempotencyKey: 'ded-1' };
    const prisma = {
      financeiroLancamento: {
        findFirst: jest.fn().mockResolvedValue({ id: 'l1', tenantId: 't1', tipo: 'receber' }),
        update: jest.fn(),
      },
      employment: {
        findFirst: jest.fn().mockResolvedValue({ id: 'e1', tenantId: 't1', employeeId: 'emp1' }),
      },
      financePayrollDeductionLink: {
        findFirst: jest.fn().mockResolvedValue(existing),
        create: jest.fn(),
      },
    };
    const svc = new FinancePayrollDeductionService(prisma as never, { log: jest.fn() } as never);
    const out = await svc.scheduleForReceivable(
      't1',
      'l1',
      {
        employmentId: 'e1',
        employeeId: 'emp1',
        competenceMonth: '2026-02-01',
        idempotencyKey: 'ded-1',
        amount: 50,
      },
      'u1',
    );
    expect(out).toBe(existing);
    expect(prisma.financePayrollDeductionLink.create).not.toHaveBeenCalled();
  });
});

describe('baixa parcial — composição', () => {
  it('saldo remanescente após componentes da baixa', () => {
    const ob = moneyDecimal(1000);
    const partialFinal = computeSettlementFinal({
      amountSettled: moneyDecimal(400),
      interestAmount: moneyDecimal(0),
      penaltyAmount: moneyDecimal(0),
      discountAmount: moneyDecimal(0),
    });
    const remaining = ob.sub(partialFinal);
    expect(remaining.toNumber()).toBe(600);
  });
});
