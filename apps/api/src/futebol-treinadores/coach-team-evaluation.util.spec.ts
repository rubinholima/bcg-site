import {
  buildPlayerEvaluationStats,
  computePeriodicRatingsByPlayer,
  resolveQuarterlyPeriodRange,
  sessionDurationMinutes,
  suggestQuarterlyPeriodKey,
  validateQuarterlyTeamReportSubmit,
} from './coach-team-evaluation.util';

describe('coach-team-evaluation.util', () => {
  it('resolveQuarterlyPeriodRange — fevereiro', () => {
    expect(resolveQuarterlyPeriodRange(2026, 'fevereiro')).toEqual({
      periodKey: 'fevereiro',
      season: 2026,
      start: '2026-02-01',
      end: '2026-02-28',
    });
  });

  it('suggestQuarterlyPeriodKey', () => {
    expect(suggestQuarterlyPeriodKey(new Date(2026, 1, 10))).toBe('fevereiro');
    expect(suggestQuarterlyPeriodKey(new Date(2026, 7, 1))).toBe('setembro');
    expect(suggestQuarterlyPeriodKey(new Date(2026, 10, 15))).toBe('fim_temporada');
  });

  it('sessionDurationMinutes — start/end', () => {
    expect(
      sessionDurationMinutes({
        startTime: '09:00',
        endTime: '10:30',
        activities: [],
      }),
    ).toBe(90);
  });

  it('buildPlayerEvaluationStats — jogos, treinos e média', () => {
    const players = [
      { id: 'p1', name: 'João', jerseyNumber: 10, category: 'Sub-17' },
      { id: 'p2', name: 'Pedro', jerseyNumber: 7, category: 'Sub-17' },
    ];
    const stats = buildPlayerEvaluationStats({
      players,
      from: '2026-02-01',
      to: '2026-02-28',
      matchReports: [
        {
          id: 'm1',
          matchDate: new Date('2026-02-15T12:00:00Z'),
          status: 'finalizado',
          playerRatings: [
            { playerId: 'p1', rating: 4 },
            { playerId: 'p2', rating: 3 },
          ],
          fmfMatchReport: null,
        },
      ],
      fmfOnlyMatches: [],
      trainingSessions: [
        {
          sessionDate: '2026-02-05',
          status: 'finalizado',
          startTime: '08:00',
          endTime: '09:30',
          activities: [],
          playerEntries: [
            { playerId: 'p1', available: true },
            { playerId: 'p2', available: false },
          ],
        },
      ],
    });

    const p1 = stats.find((s) => s.playerId === 'p1');
    const p2 = stats.find((s) => s.playerId === 'p2');
    expect(p1?.gamesCount).toBe(1);
    expect(p1?.avgMatchRating).toBe(4);
    expect(p1?.trainingMinutes).toBe(90);
    expect(p2?.trainingMinutes).toBe(0);
  });

  it('computePeriodicRatingsByPlayer', () => {
    const map = computePeriodicRatingsByPlayer(
      [
        {
          playerId: 'p1',
          coachFinalRating: 4,
          report: { season: 2026, periodKey: 'fevereiro', status: 'enviado' },
        },
        {
          playerId: 'p1',
          coachFinalRating: 3,
          report: { season: 2026, periodKey: 'julho', status: 'enviado' },
        },
      ],
      2026,
      'julho',
    );
    expect(map.get('p1')).toEqual([4, 3]);
  });

  it('validateQuarterlyTeamReportSubmit', () => {
    expect(
      validateQuarterlyTeamReportSubmit({
        periodKey: null,
        generalDescription: 'ok',
        playerEvaluations: [],
        squadPlayerIds: [],
      }),
    ).toContain('janela trimestral');

    expect(
      validateQuarterlyTeamReportSubmit({
        periodKey: 'fevereiro',
        generalDescription: '',
        playerEvaluations: [{ playerId: 'p1', coachFinalRating: 4 }],
        squadPlayerIds: ['p1'],
      }),
    ).toContain('descrição');

    expect(
      validateQuarterlyTeamReportSubmit({
        periodKey: 'fevereiro',
        generalDescription: 'Período positivo',
        playerEvaluations: [{ playerId: 'p1', coachFinalRating: null }],
        squadPlayerIds: ['p1'],
      }),
    ).toContain('nota final');
  });
});
