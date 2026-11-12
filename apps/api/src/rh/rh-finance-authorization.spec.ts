import { PayrollClosingService } from './payroll-closing.service';

const RH_PRIVATE_KEYS = [
  'bankData',
  'bulkFileKey',
  'extractedFileKey',
  'fileKey',
  'pixKey',
  'ctpsUrl',
  'pisNumber',
];

describe('RH → Financeiro handoff authorization', () => {
  it('createOrGetProjection recebe só metadados de projeção, sem chaves RH', async () => {
    const closing = {
      id: 'close-1',
      tenantId: 't1',
      referenceMonth: new Date('2026-11-01'),
      status: 'RH_APPROVED',
      adjustments: [],
      employeeSnapshots: [
        { employmentId: 'emp-1', snapshot: { salaryBase: 100, compensationItems: [] } },
      ],
      paymentDueDate: null,
      accountingPackage: null,
      accountingHistory: [],
      statusHistory: [],
      financeLancamentoId: null,
    };

    const financeiro = {
      createOrGetProjection: jest.fn().mockResolvedValue({
        lancamento: { id: 'lanc-1', valor: 100, sourceModule: 'rh_payroll' },
        created: true,
      }),
    };

    const prisma = {
      rhPayrollClosing: {
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const audit = { log: jest.fn() };
    const service = new PayrollClosingService(prisma as never, financeiro as never, audit as never, {} as never);
    jest.spyOn(service, 'findOne').mockResolvedValue(closing as never);

    await service.handoffFinance(
      'close-1',
      ['t1'],
      { userId: 'u1', name: 'RH' },
      { paymentDueDate: '2026-12-05' },
    );

    expect(financeiro.createOrGetProjection).toHaveBeenCalledTimes(1);
    const dto = financeiro.createOrGetProjection.mock.calls[0][0];
    const json = JSON.stringify(dto);
    for (const key of RH_PRIVATE_KEYS) {
      expect(json).not.toContain(`"${key}"`);
    }
    expect(dto.sourceModule).toBe('rh_payroll');
    expect(dto.sourceType).toBe('payroll_closing');
    expect(dto.sourceId).toBe('close-1');
    expect(Object.keys(dto)).not.toContain('bankData');
  });
});
