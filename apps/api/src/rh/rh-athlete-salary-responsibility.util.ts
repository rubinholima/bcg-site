export type SalaryResponsibilityMode = 'NOSSO_100' | 'OUTRO_100' | 'COMPARTILHADO';

export function normalizeSalaryResponsibilityMode(raw: string): SalaryResponsibilityMode {
  const m = raw.trim().toUpperCase();
  if (m === 'NOSSO_100' || m === 'OUTRO_100' || m === 'COMPARTILHADO') return m;
  throw new Error('Modo de responsabilidade salarial inválido.');
}

export function validateSalaryResponsibilityPercentages(
  mode: SalaryResponsibilityMode,
  ourPercentage?: number | null,
  otherPercentage?: number | null,
): { our: number; other: number } {
  if (mode === 'NOSSO_100') {
    return { our: 100, other: 0 };
  }
  if (mode === 'OUTRO_100') {
    return { our: 0, other: 100 };
  }
  const our = ourPercentage ?? NaN;
  const other = otherPercentage ?? NaN;
  if (!Number.isFinite(our) || !Number.isFinite(other)) {
    throw new Error('Informe os percentuais compartilhados.');
  }
  const total = Math.round((our + other) * 100) / 100;
  if (Math.abs(total - 100) > 0.01) {
    throw new Error('A soma dos percentuais deve ser 100%.');
  }
  return { our, other };
}

export function computeOurPayrollAmount(contractualSalary: number, ourPercentage: number): number {
  return Math.round((contractualSalary * ourPercentage) / 100 * 100) / 100;
}
