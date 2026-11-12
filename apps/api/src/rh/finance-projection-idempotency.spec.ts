import { FinanceiroLancamentosService } from '../financeiro/financeiro-lancamentos.service';

describe('Finance projection idempotency — rh_payroll', () => {
  const existingRow = {
    id: 'lanc-rh-1',
    tenantId: 't1',
    tipo: 'pagar',
    status: 'pendente',
    ownershipKind: 'projection',
    sourceModule: 'rh_payroll',
    sourceType: 'payroll_closing',
    sourceId: 'closing-1',
    valor: { toNumber: () => 1200 },
  };

  it('reutiliza projeção rh_payroll', async () => {
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
      tipo: 'pagar',
      status: 'pendente',
      ownershipKind: 'projection',
      sourceModule: 'rh_payroll',
      sourceType: 'payroll_closing',
      sourceId: 'closing-1',
      valor: 1200,
      dueDate: new Date().toISOString(),
      descricao: 'Folha',
    });

    expect(result.created).toBe(false);
    expect(service.create).not.toHaveBeenCalled();
  });
});
