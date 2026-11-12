import {
  computeOurPayrollAmount,
  validateSalaryResponsibilityPercentages,
} from './rh-athlete-salary-responsibility.util';

describe('RhAthleteSalaryResponsibility', () => {
  it('NOSSO_100', () => {
    const p = validateSalaryResponsibilityPercentages('NOSSO_100', null, null);
    expect(p).toEqual({ our: 100, other: 0 });
  });

  it('OUTRO_100', () => {
    const p = validateSalaryResponsibilityPercentages('OUTRO_100', null, null);
    expect(p).toEqual({ our: 0, other: 100 });
  });

  it('COMPARTILHADO soma 100', () => {
    const p = validateSalaryResponsibilityPercentages('COMPARTILHADO', 40, 60);
    expect(p).toEqual({ our: 40, other: 60 });
    expect(computeOurPayrollAmount(10000, 40)).toBe(4000);
  });

  it('rejeita soma diferente de 100', () => {
    expect(() => validateSalaryResponsibilityPercentages('COMPARTILHADO', 40, 50)).toThrow();
  });
});
