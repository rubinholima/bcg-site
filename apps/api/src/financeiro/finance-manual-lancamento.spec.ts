import { FinanceiroLancamentosService } from './financeiro-lancamentos.service';

describe('FinanceiroLancamentosService.createManualOperational', () => {
  it('cria lançamento manual_cup360 com originalAmount', async () => {
    const created = { id: 'l1', valor: { toNumber: () => 250 }, tenantId: 't1' };
    const prisma = {
      tenant: { findUnique: jest.fn().mockResolvedValue({ id: 't1' }) },
      financeiroLancamento: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created),
      },
    };
    const audit = { log: jest.fn() };
    const service = new FinanceiroLancamentosService(prisma as never, audit as never);
    jest.spyOn(service, 'create').mockImplementation(async (dto) => {
      expect(dto.recordOrigin).toBe('manual_cup360');
      expect(dto.originalAmount).toBe(250);
      return { id: 'l1', valor: 250 } as never;
    });

    await service.createManualOperational(
      {
        tenantId: 't1',
        tipo: 'pagar',
        descricao: 'Teste',
        valor: 250,
        dueDate: '2026-12-01',
        financeAccountId: 'acc-1',
      },
      { userId: 'u1', name: 'Op' },
    );
  });
});
