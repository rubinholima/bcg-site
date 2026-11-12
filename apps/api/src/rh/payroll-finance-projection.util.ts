export type PayrollSnapshotLike = {
  employmentId: string;
  snapshot: unknown;
};

export type PayrollAdjustmentLike = {
  employmentId: string;
  amount?: unknown | null;
};

export type PayrollSnapshotComposition = {
  salaryBase: number;
  benefitsTotal: number;
  ourPayrollAmount: number;
  adjustmentsTotal: number;
  estimatedTotal: number;
};

function snapshotRecord(snapshot: unknown): Record<string, unknown> {
  if (snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)) {
    return snapshot as Record<string, unknown>;
  }
  return {};
}

/** Composição financeira a partir do snapshot congelado + ajustes do fechamento (sem recalcular vínculo atual). */
export function composeSnapshotFinancialTotal(
  snapshot: PayrollSnapshotLike,
  adjustments: PayrollAdjustmentLike[],
): PayrollSnapshotComposition {
  const snap = snapshotRecord(snapshot.snapshot);
  const salaryBase = Number(snap.salaryBase ?? 0);
  const ourPayrollAmount = Number(
    (snap.athleteMovement as { ourPayrollAmount?: number } | undefined)?.ourPayrollAmount ?? salaryBase,
  );
  const items = (snap.compensationItems as Array<{ amount?: number | string }> | undefined) ?? [];
  const benefitsTotal = items.reduce((acc, item) => acc + Number(item.amount ?? 0), 0);
  const employmentAdjustments = adjustments.filter((a) => a.employmentId === snapshot.employmentId);
  const adjustmentsTotal = employmentAdjustments.reduce(
    (acc, adj) => acc + (adj.amount != null ? Number(adj.amount) : 0),
    0,
  );
  const estimatedTotal = ourPayrollAmount + benefitsTotal + adjustmentsTotal;
  return {
    salaryBase,
    benefitsTotal,
    ourPayrollAmount,
    adjustmentsTotal,
    estimatedTotal,
  };
}

export function sumPayrollClosingFinancialTotal(
  employeeSnapshots: PayrollSnapshotLike[],
  adjustments: PayrollAdjustmentLike[],
): number {
  if (!employeeSnapshots.length) return 0;
  return employeeSnapshots.reduce(
    (acc, snap) => acc + composeSnapshotFinancialTotal(snap, adjustments).estimatedTotal,
    0,
  );
}
