import { computeOurPayrollAmount } from './rh-athlete-salary-responsibility.util';

export type AthletePayrollSnapshotExtras = {
  athleteMovement?: {
    impactType: string;
    ourPercentage: number;
    otherPercentage: number;
    contractualSalary: number;
    ourPayrollAmount: number;
    responsibilityMode?: string;
    playerNegotiationId?: string;
  };
};

export function enrichPayrollSnapshotWithResponsibility(
  baseSnapshot: Record<string, unknown>,
  input: {
    contractualSalary: number;
    mode: string;
    ourPercentage: number;
    otherPercentage: number;
    impactType?: string;
    playerNegotiationId?: string;
  },
): Record<string, unknown> & AthletePayrollSnapshotExtras {
  const ourPayrollAmount = computeOurPayrollAmount(input.contractualSalary, input.ourPercentage);
  return {
    ...baseSnapshot,
    contractualSalary: input.contractualSalary,
    ourResponsibilityPercentage: input.ourPercentage,
    otherResponsibilityPercentage: input.otherPercentage,
    ourPayrollAmount,
    athleteMovement: {
      impactType: input.impactType ?? 'loan',
      ourPercentage: input.ourPercentage,
      otherPercentage: input.otherPercentage,
      contractualSalary: input.contractualSalary,
      ourPayrollAmount,
      responsibilityMode: input.mode,
      playerNegotiationId: input.playerNegotiationId,
    },
  };
}
