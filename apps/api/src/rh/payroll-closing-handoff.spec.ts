import { BadRequestException } from '@nestjs/common';
import { PayrollClosingService } from './payroll-closing.service';

describe('PayrollClosingService.handoffFinance', () => {
  const snapshots = [
    {
      employmentId: 'emp-1',
      snapshot: { salaryBase: 1000, compensationItems: [{ amount: 100 }] },
    },
  ];

  const baseClosing = {
    id: 'close-1',
    tenantId: 't1',
    referenceMonth: new Date('2026-11-01'),
    status: 'RH_APPROVED',
    adjustments: [],
    employeeSnapshots: snapshots,
    accountingPackage: null,
    accountingHistory: [],
    statusHistory: [],
    financeLancamentoId: null,
    paymentDueDate: null,
  };

  function makeService() {
    const financeiro = {
      createOrGetProjection: jest.fn().mockResolvedValue({
        lancamento: { id: 'lanc-1', valor: 1100 },
        created: true,
      }),
      findProjectionBySource: jest.fn(),
    };
    const prisma = { rhPayrollClosing: { update: jest.fn().mockResolvedValue({}) } };
    const audit = { log: jest.fn() };
    const service = new PayrollClosingService(
      prisma as never,
      financeiro as never,
      audit as never,
      {} as never,
    );
    jest.spyOn(service, 'findOne').mockResolvedValue(baseClosing as never);
    return { service, financeiro, prisma };
  }

  it('bloqueia envio com total zero (nunca R$ 0,01)', async () => {
    const { service, financeiro } = makeService();
    jest.spyOn(service, 'findOne').mockResolvedValue({
      ...baseClosing,
      employeeSnapshots: [{ employmentId: 'e', snapshot: { salaryBase: 0 } }],
    } as never);

    await expect(
      service.handoffFinance('close-1', ['t1'], { userId: 'u', name: 'T' }, { paymentDueDate: '2026-12-05' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(financeiro.createOrGetProjection).not.toHaveBeenCalled();
  });

  it('projeta total a partir dos snapshots', async () => {
    const { service, financeiro } = makeService();
    await service.handoffFinance(
      'close-1',
      ['t1'],
      { userId: 'u', name: 'T' },
      { paymentDueDate: '2026-12-05' },
    );
    const arg = financeiro.createOrGetProjection.mock.calls[0][0];
    expect(arg.valor).toBe(1100);
    expect(arg.dueDate).toContain('2026-12-05');
    expect(arg.recordOrigin).toBe('cup360_module');
  });
});
