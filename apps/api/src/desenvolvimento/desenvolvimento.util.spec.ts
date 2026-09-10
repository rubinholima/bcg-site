import {
  computeProgressPct,
  isCourseVisibleToTenant,
  resolveEnrollmentStatus,
  scoreQuizAttempt,
} from './desenvolvimento.util';

describe('desenvolvimento.util', () => {
  it('scoreQuizAttempt calculates percentage', () => {
    const questions = [
      { id: 'q1', payload: { correctIndex: 1 } },
      { id: 'q2', payload: { correctIndex: 0 } },
    ];
    const result = scoreQuizAttempt(questions, [
      { questionId: 'q1', selectedIndex: 1 },
      { questionId: 'q2', selectedIndex: 0 },
    ]);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(true);
  });

  it('computeProgressPct handles totals', () => {
    expect(computeProgressPct(2, 4)).toBe(50);
    expect(computeProgressPct(0, 0)).toBe(0);
  });

  it('isCourseVisibleToTenant respects allowed list', () => {
    expect(isCourseVisibleToTenant('t1', ['t1', 't2'])).toBe(true);
    expect(isCourseVisibleToTenant('t3', ['t1'])).toBe(false);
    expect(isCourseVisibleToTenant('t1', null)).toBe(true);
  });

  it('resolveEnrollmentStatus marks overdue when mandatory and past due', () => {
    const past = new Date('2020-01-01');
    expect(resolveEnrollmentStatus(10, true, past)).toBe('overdue');
    expect(resolveEnrollmentStatus(100, true, past)).toBe('completed');
  });
});
