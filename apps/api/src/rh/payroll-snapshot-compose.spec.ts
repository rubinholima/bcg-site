import { PayrollClosingService } from './payroll-closing.service';

describe('PayrollClosingService.getSnapshotComposition', () => {
  const snapshotRow = {
    id: 'snap-1',
    employmentId: 'emp-v1',
    employeeId: 'emp-e1',
    snapshot: {
      salaryBase: 5000,
      compensationItems: [
        { type: 'TRANSPORT', amount: 200 },
        { type: 'MEAL', amount: 300 },
      ],
      athleteMovement: { ourPayrollAmount: 2500 },
    },
  };

  const closing = {
    id: 'close-1',
    tenantId: 't1',
    referenceMonth: new Date('2026-11-01'),
    status: 'PREPARING',
    employeeSnapshots: [snapshotRow],
    adjustments: [
      { id: 'adj-1', employmentId: 'emp-v1', amount: 150, adjustmentType: 'bonus' },
      { id: 'adj-2', employmentId: 'emp-v2', amount: 999, adjustmentType: 'outro' },
    ],
    accountingPackage: null,
    accountingHistory: [],
    statusHistory: [],
  };

  it('monta composição a partir do snapshot e ajustes filtrados', async () => {
    const prisma = {} as never;
    const financeiro = {} as never;
    const audit = { log: jest.fn() } as never;
    const athleteMovement = {} as never;
    const service = new PayrollClosingService(prisma, financeiro, audit, athleteMovement);
    jest.spyOn(service, 'findOne').mockResolvedValue(closing as never);

    const result = await service.getSnapshotComposition('close-1', 'snap-1', ['t1']);

    expect(result.composition.salaryBase).toBe(5000);
    expect(result.composition.benefitsTotal).toBe(500);
    expect(result.composition.ourPayrollAmount).toBe(2500);
    expect(result.composition.adjustmentsTotal).toBe(150);
    expect(result.composition.estimatedTotal).toBe(3150);
    expect(result.adjustments).toHaveLength(1);
    expect(result.adjustments[0].id).toBe('adj-1');
  });
});
