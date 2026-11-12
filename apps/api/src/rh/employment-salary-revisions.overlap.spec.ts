import { periodsOverlap, startOfDay } from './employment-compensation.util';

describe('employment-salary-revisions overlap fix', () => {
  it('revisão aberta fechada no dia anterior não sobrepõe a nova', () => {
    const effectiveFrom = startOfDay(new Date('2026-03-01'));
    const prevFrom = startOfDay(new Date('2026-01-01'));
    const dayBefore = new Date(effectiveFrom);
    dayBefore.setDate(dayBefore.getDate() - 1);
    expect(periodsOverlap(prevFrom, dayBefore, effectiveFrom, null)).toBe(false);
  });
});
