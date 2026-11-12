import {
  composeSnapshotFinancialTotal,
  sumPayrollClosingFinancialTotal,
} from './payroll-finance-projection.util';

describe('payroll-finance-projection.util', () => {
  const snapshots = [
    {
      employmentId: 'emp-1',
      snapshot: {
        salaryBase: 5000,
        compensationItems: [{ amount: 200 }, { amount: 300 }],
        athleteMovement: { ourPayrollAmount: 2500 },
      },
    },
    {
      employmentId: 'emp-2',
      snapshot: { salaryBase: 3000, compensationItems: [] },
    },
  ];

  const adjustments = [
    { employmentId: 'emp-1', amount: 150 },
    { employmentId: 'emp-2', amount: -50 },
  ];

  it('compõe total por snapshot como na conferência de folha', () => {
    const c1 = composeSnapshotFinancialTotal(snapshots[0], adjustments);
    expect(c1.estimatedTotal).toBe(3150);
    const c2 = composeSnapshotFinancialTotal(snapshots[1], adjustments);
    expect(c2.estimatedTotal).toBe(2950);
  });

  it('soma fechamento inteiro', () => {
    expect(sumPayrollClosingFinancialTotal(snapshots, adjustments)).toBe(6100);
  });

  it('retorna zero sem snapshots', () => {
    expect(sumPayrollClosingFinancialTotal([], adjustments)).toBe(0);
  });
});
