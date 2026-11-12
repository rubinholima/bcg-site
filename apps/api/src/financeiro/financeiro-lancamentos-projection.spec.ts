import { BadRequestException } from '@nestjs/common';
import { FinanceiroLancamentosService } from './financeiro-lancamentos.service';

describe('FinanceiroLancamentosService.createOrGetProjection', () => {
  const existingRow = {
    id: 'lanc-1',
    tenantId: 't1',
    tipo: 'receber',
    status: 'pago',
    ownershipKind: 'projection',
    sourceModule: 'bch_ticketing',
    sourceType: 'event_ticket_order',
    sourceId: 'order-1',
    currency: 'USD',
    valor: { toNumber: () => 100 },
  };

  it('reutiliza projeção existente sem chamar create', async () => {
    const prisma = {
      financeiroLancamento: {
        findFirst: jest.fn().mockResolvedValue(existingRow),
      },
    };
    const audit = { log: jest.fn() };
    const service = new FinanceiroLancamentosService(prisma as never, audit as never);
    jest.spyOn(service, 'create');

    const result = await service.createOrGetProjection({
      tenantId: 't1',
      tipo: 'receber',
      status: 'pago',
      ownershipKind: 'projection',
      sourceModule: 'bch_ticketing',
      sourceType: 'event_ticket_order',
      sourceId: 'order-1',
      valor: 100,
      dueDate: new Date().toISOString(),
      descricao: 'Test',
    });

    expect(result.created).toBe(false);
    expect(result.lancamento.id).toBe('lanc-1');
    expect(service.create).not.toHaveBeenCalled();
  });

  it('após race (BadRequest duplicata), retorna existente', async () => {
    const prisma = {
      financeiroLancamento: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(existingRow),
      },
    };
    const audit = { log: jest.fn() };
    const service = new FinanceiroLancamentosService(prisma as never, audit as never);
    jest.spyOn(service, 'create').mockRejectedValue(
      new BadRequestException('Já existe lançamento financeiro para esta origem.'),
    );

    const result = await service.createOrGetProjection({
      tenantId: 't1',
      tipo: 'receber',
      status: 'pago',
      ownershipKind: 'projection',
      sourceModule: 'bch_ticketing',
      sourceType: 'event_ticket_order',
      sourceId: 'order-1',
      valor: 100,
      dueDate: new Date().toISOString(),
      descricao: 'Test',
    });

    expect(result.created).toBe(false);
    expect(result.lancamento.id).toBe('lanc-1');
  });

  it('após race P2002, retorna existente', async () => {
    const prisma = {
      financeiroLancamento: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(existingRow),
      },
    };
    const audit = { log: jest.fn() };
    const service = new FinanceiroLancamentosService(prisma as never, audit as never);
    jest.spyOn(service, 'create').mockRejectedValue({ code: 'P2002' });

    const result = await service.createOrGetProjection({
      tenantId: 't1',
      tipo: 'receber',
      status: 'pago',
      ownershipKind: 'projection',
      sourceModule: 'bch_ticketing',
      sourceType: 'event_ticket_order',
      sourceId: 'order-1',
      valor: 100,
      dueDate: new Date().toISOString(),
      descricao: 'Test',
    });

    expect(result.created).toBe(false);
    expect(result.lancamento.id).toBe('lanc-1');
  });
});
