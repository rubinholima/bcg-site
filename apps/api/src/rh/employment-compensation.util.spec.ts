import {
  assertNoOverlapSameKind,
  compensationAmountAtDate,
  getCurrentSalary,
  getSalaryAtDate,
  isEffectiveAtDate,
  mergeBankDataJson,
  normalizeHolderCpf,
  pickCompensationAtDate,
  receivesCompensationAtDate,
  startOfDay,
} from './employment-compensation.util';

describe('employment-compensation.util', () => {
  const july = startOfDay(new Date('2026-07-15T12:00:00'));
  const jan = startOfDay(new Date('2026-01-01T12:00:00'));
  const aug = startOfDay(new Date('2026-08-01T12:00:00'));

  const transportItems = [
    {
      kind: 'TRANSPORT',
      amount: 220,
      effectiveFrom: jan,
      effectiveTo: startOfDay(new Date('2026-07-31T12:00:00')),
    },
    {
      kind: 'TRANSPORT',
      amount: 250,
      effectiveFrom: aug,
      effectiveTo: null,
    },
    {
      kind: 'MEAL',
      amount: 600,
      effectiveFrom: jan,
      effectiveTo: null,
    },
  ];

  it('TRANSPORT ativo na data de julho (valor antigo)', () => {
    expect(receivesCompensationAtDate(transportItems, 'TRANSPORT', july)).toBe(true);
    expect(compensationAmountAtDate(transportItems, 'TRANSPORT', july)).toBe(220);
  });

  it('TRANSPORT expirado usa novo valor em agosto', () => {
    const date = startOfDay(new Date('2026-08-15T12:00:00'));
    expect(compensationAmountAtDate(transportItems, 'TRANSPORT', date)).toBe(250);
  });

  it('MEAL independente de TRANSPORT', () => {
    expect(receivesCompensationAtDate(transportItems, 'MEAL', july)).toBe(true);
    expect(compensationAmountAtDate(transportItems, 'MEAL', july)).toBe(600);
  });

  it('COST_ALLOWANCE derived correctly', () => {
    const items = [
      { kind: 'COST_ALLOWANCE', amount: 1500, effectiveFrom: jan, effectiveTo: null },
    ];
    expect(receivesCompensationAtDate(items, 'COST_ALLOWANCE', july)).toBe(true);
    expect(compensationAmountAtDate(items, 'COST_ALLOWANCE', july)).toBe(1500);
  });

  it('IMAGE_RIGHTS derived correctly', () => {
    const items = [
      { kind: 'IMAGE_RIGHTS', amount: 8000, effectiveFrom: jan, effectiveTo: null },
    ];
    expect(receivesCompensationAtDate(items, 'IMAGE_RIGHTS', july)).toBe(true);
  });

  it('rejeita overlap same kind', () => {
    expect(() =>
      assertNoOverlapSameKind(
        [{ kind: 'MEAL', amount: 100, effectiveFrom: jan, effectiveTo: null }],
        'MEAL',
        startOfDay(new Date('2026-06-01T12:00:00')),
        null,
      ),
    ).toThrow();
  });

  it('permite overlap de kinds diferentes', () => {
    expect(() =>
      assertNoOverlapSameKind(
        [{ kind: 'TRANSPORT', amount: 100, effectiveFrom: jan, effectiveTo: null }],
        'MEAL',
        jan,
        null,
      ),
    ).not.toThrow();
  });

  it('salary revision current vs historical', () => {
    const revisions = [
      { amount: 5000, effectiveFrom: jan, effectiveTo: startOfDay(new Date('2026-06-30T12:00:00')) },
      { amount: 5500, effectiveFrom: startOfDay(new Date('2026-07-01T12:00:00')), effectiveTo: null },
    ];
    expect(getSalaryAtDate(revisions, 5000, july)).toBe(5500);
    expect(getSalaryAtDate(revisions, 5000, startOfDay(new Date('2026-03-01T12:00:00')))).toBe(5000);
  });

  it('future revision does not become current before effective date', () => {
    const today = startOfDay(new Date('2026-08-01T12:00:00'));
    const revisions = [
      { amount: 5000, effectiveFrom: jan, effectiveTo: null },
      { amount: 7000, effectiveFrom: startOfDay(new Date('2026-09-01T12:00:00')), effectiveTo: null },
    ];
    expect(getCurrentSalary(revisions, 5000, today)).toBe(5000);
  });

  it('salaryBase fallback when no revision matches', () => {
    expect(getSalaryAtDate([], 4200, july)).toBe(4200);
  });

  it('mergeBankData preserves unknown keys', () => {
    const merged = mergeBankDataJson({ legacyKey: 'x', bank: 'Old' }, { bank: 'New', holderName: 'Maria' });
    expect(merged.legacyKey).toBe('x');
    expect(merged.bank).toBe('New');
    expect(merged.holderName).toBe('Maria');
  });

  it('normalizeHolderCpf strips formatting', () => {
    expect(normalizeHolderCpf('123.456.789-00')).toBe('12345678900');
  });

  it('pickCompensationAtDate picks latest valid item', () => {
    const picked = pickCompensationAtDate(transportItems, 'TRANSPORT', aug);
    expect(picked?.amount).toBe(250);
  });

  it('isEffectiveAtDate respects bounds', () => {
    expect(isEffectiveAtDate(jan, null, july)).toBe(true);
    expect(isEffectiveAtDate(aug, null, july)).toBe(false);
  });
});
