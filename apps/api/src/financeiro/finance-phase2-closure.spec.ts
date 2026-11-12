import { Prisma } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import { FinanceDelegationService } from './finance-delegation.service';
import { FinanceReconciliationService } from './finance-reconciliation.service';
import { FinanceDocumentService } from './finance-document.service';
import { FinanceSettlementService } from './finance-settlement.service';
import { splitInstallmentAmounts, moneyDecimal } from './finance-money.util';
import { FinanceTransferService } from './finance-transfer.service';

describe('FinanceDelegationService', () => {
  const prisma = {
    financePaymentDelegation: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };
  const svc = new FinanceDelegationService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('delegação ativa quando dentro da validade', async () => {
    prisma.financePaymentDelegation.findFirst.mockResolvedValue({ id: 'd1' });
    await expect(svc.hasActiveDelegation('t1', 'u2', 'finance_pay')).resolves.toBe(true);
  });

  it('delegação expirada não retorna hit', async () => {
    prisma.financePaymentDelegation.findFirst.mockResolvedValue(null);
    await expect(svc.hasActiveDelegation('t1', 'u2', 'finance_pay')).resolves.toBe(false);
  });
});

describe('conciliação separada da baixa', () => {
  it('marca reconciled sem alterar status de pagamento', async () => {
    const prisma = {
      financeiroLancamento: {
        findFirst: jest.fn().mockResolvedValue({ id: 'l1', tenantId: 't1', status: 'pago' }),
        update: jest.fn().mockResolvedValue({ reconciliationStatus: 'reconciled' }),
      },
    };
    const audit = { log: jest.fn() };
    const svc = new FinanceReconciliationService(prisma as never, audit as never);
    await svc.markReconciled('t1', 'l1', { status: 'reconciled' }, 'u1');
    expect(prisma.financeiroLancamento.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reconciliationStatus: 'reconciled' }),
      }),
    );
  });
});

describe('FinanceDocumentService — tenant', () => {
  it('nega download cross-tenant', async () => {
    const prisma = {
      financeLancamentoDocument: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const s3 = { getObject: jest.fn() };
    const svc = new FinanceDocumentService(prisma as never, s3 as never, { log: jest.fn() } as never);
    await expect(svc.downloadStream('other-tenant', 'doc1')).rejects.toThrow();
  });
});

describe('FinanceSettlementService — legado bloqueado', () => {
  it('bloqueia nova baixa estruturada em título legado', async () => {
    const prisma = {
      financeSettlement: {
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      financeiroLancamento: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'l1',
          tenantId: 't1',
          status: 'pago',
          settledAt: new Date(),
          valor: new Prisma.Decimal(100),
          amountSettledTotal: new Prisma.Decimal(0),
          currency: 'BRL',
        }),
      },
      financeAccount: { findFirst: jest.fn() },
      $transaction: jest.fn(),
    };
    const svc = new FinanceSettlementService(
      prisma as never,
      { log: jest.fn() } as never,
      { hasActiveDelegation: jest.fn() } as never,
      {} as never,
      { getSlugsForActor: jest.fn().mockResolvedValue(['finance_pay']) } as never,
    );
    await expect(
      svc.createSettlement(
        { sub: 'u1', role: 'super_admin' } as never,
        'u1',
        'op',
        {
          tenantId: 't1',
          financeiroLancamentoId: 'l1',
          idempotencyKey: 'k1',
          settledAt: new Date().toISOString(),
          amountSettled: 50,
          actualFinanceAccountId: 'acc',
        },
      ),
    ).rejects.toThrow('baixa legada');
  });
});

describe('transferência — duas pernas', () => {
  it('cria outbound e inbound na transação', async () => {
    const tx = {
      financeInternalTransfer: { create: jest.fn().mockResolvedValue({ id: 'h1' }) },
      financeTransferLeg: { create: jest.fn() },
    };
    const prisma = {
      financeInternalTransfer: { findFirst: jest.fn().mockResolvedValue(null) },
      financeAccount: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 's', currency: 'BRL', active: true })
          .mockResolvedValueOnce({ id: 'd', currency: 'BRL', active: true }),
      },
      $transaction: jest.fn(async (fn) => fn(tx)),
    };
    const svc = new FinanceTransferService(prisma as never, { log: jest.fn() } as never);
    await svc.createInternalTransfer(
      't1',
      {
        sourceAccountId: 's',
        destAccountId: 'd',
        amount: 10,
        transferDate: '2026-01-01',
        idempotencyKey: 'uniq-tr',
      },
      'u1',
    );
    expect(tx.financeTransferLeg.create).toHaveBeenCalledTimes(2);
  });
});

describe('parcelas — edição isolada', () => {
  it('rounding reconcilia total', () => {
    const parts = splitInstallmentAmounts(moneyDecimal(500), 5);
    const sum = parts.reduce((a, b) => a.add(b), moneyDecimal(0));
    expect(sum.toNumber()).toBe(500);
    expect(parts).toHaveLength(5);
  });
});

describe('FinanceSettlementService.assertPayPermission', () => {
  it('nega sem capacidade nem delegação', async () => {
    const prisma = {
      financeSettlement: { findFirst: jest.fn().mockResolvedValue(null), count: jest.fn().mockResolvedValue(0) },
      financeiroLancamento: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'l1',
          tenantId: 't1',
          status: 'pendente',
          settledAt: null,
          valor: new Prisma.Decimal(10),
          amountSettledTotal: new Prisma.Decimal(0),
          currency: 'BRL',
          financeAccountId: null,
          payrollDeductionStatus: 'none',
        }),
      },
      financeAccount: {
        findFirst: jest.fn().mockResolvedValue({ id: 'a', tenantId: 't1', active: true, currency: 'BRL' }),
      },
      $transaction: jest.fn(),
    };
    const modules = { getSlugsForActor: jest.fn().mockResolvedValue(['finance_view']) };
    const delegations = { hasActiveDelegation: jest.fn().mockResolvedValue(false) };
    const svc = new FinanceSettlementService(
      prisma as never,
      { log: jest.fn() } as never,
      delegations as never,
      { cancelForCashSettlement: jest.fn() } as never,
      modules as never,
    );
    await expect(
      svc.createSettlement(
        { sub: 'u1', role: 'user' } as never,
        'u1',
        null,
        {
          tenantId: 't1',
          financeiroLancamentoId: 'l1',
          idempotencyKey: 'k',
          settledAt: new Date().toISOString(),
          amountSettled: 1,
          actualFinanceAccountId: 'a',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
