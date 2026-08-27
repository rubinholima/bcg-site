import {
  buildMonthlyPeriodStatuses,
  buildPlayerEvaluationStats,
  isLowerCategory,
  isValidMonthlyPeriodKey,
  resolveMonthlyPeriodRange,
  resolveMonthlyReportStatus,
  buildCategorySortOrderMap,
} from './coach-team-evaluation.util';
import { buildSquadPlayerPeriodMinutes } from './player-period-minutes.util';

describe('coach-team-evaluation.util — mensal', () => {
  it('resolveMonthlyPeriodRange — fevereiro bissexto', () => {
    expect(resolveMonthlyPeriodRange('2024-02')).toEqual({
      periodKey: '2024-02',
      season: 2024,
      start: '2024-02-01',
      end: '2024-02-29',
    });
  });

  it('resolveMonthlyPeriodRange — setembro', () => {
    expect(resolveMonthlyPeriodRange('2026-09')).toEqual({
      periodKey: '2026-09',
      season: 2026,
      start: '2026-09-01',
      end: '2026-09-30',
    });
  });

  it('isValidMonthlyPeriodKey', () => {
    expect(isValidMonthlyPeriodKey('2026-08')).toBe(true);
    expect(isValidMonthlyPeriodKey('2026-13')).toBe(false);
    expect(isValidMonthlyPeriodKey('fevereiro')).toBe(false);
  });

  it('resolveMonthlyReportStatus — pendente, rascunho, enviado, atrasado', () => {
    expect(
      resolveMonthlyReportStatus({
        periodKey: '2026-09',
        reportStatus: null,
        today: new Date(2026, 8, 15),
      }),
    ).toBe('pendente');

    expect(
      resolveMonthlyReportStatus({
        periodKey: '2026-08',
        reportStatus: 'rascunho',
        today: new Date(2026, 8, 15),
      }),
    ).toBe('atrasado');

    expect(
      resolveMonthlyReportStatus({
        periodKey: '2026-09',
        reportStatus: 'rascunho',
        today: new Date(2026, 8, 15),
      }),
    ).toBe('rascunho');

    expect(
      resolveMonthlyReportStatus({
        periodKey: '2026-08',
        reportStatus: 'enviado',
        today: new Date(2026, 8, 15),
      }),
    ).toBe('enviado');

    expect(
      resolveMonthlyReportStatus({
        periodKey: '2026-07',
        reportStatus: null,
        today: new Date(2026, 8, 15),
      }),
    ).toBe('atrasado');

    expect(
      resolveMonthlyReportStatus({
        periodKey: '2026-07',
        reportStatus: 'rascunho',
        today: new Date(2026, 8, 15),
      }),
    ).toBe('atrasado');
  });

  it('buildMonthlyPeriodStatuses', () => {
    const rows = buildMonthlyPeriodStatuses({
      season: 2026,
      today: new Date(2026, 8, 15),
      reports: [
        { periodKey: '2026-08', status: 'enviado', id: 'r1' },
        { periodKey: '2026-09', status: 'rascunho', id: 'r2' },
      ],
    });
    expect(rows.find((r) => r.periodKey === '2026-08')?.status).toBe('enviado');
    expect(rows.find((r) => r.periodKey === '2026-09')?.status).toBe('rascunho');
    expect(rows.find((r) => r.periodKey === '2026-07')?.status).toBe('atrasado');
    expect(rows.find((r) => r.periodKey === '2026-10')).toBeUndefined();
  });

  it('isLowerCategory via sortOrder', () => {
    const map = buildCategorySortOrderMap([
      { value: 'sub14', sortOrder: 1 },
      { value: 'sub17', sortOrder: 2 },
      { value: 'sub20', sortOrder: 3 },
    ]);
    expect(isLowerCategory('sub14', 'sub17', map)).toBe(true);
    expect(isLowerCategory('sub17', 'sub17', map)).toBe(false);
    expect(isLowerCategory('sub20', 'sub17', map)).toBe(false);
  });
});

describe('buildPlayerEvaluationStats — minutos mensais', () => {
  it('conta minutos com minutesPlayed > 0 sem played=true', () => {
    const stats = buildPlayerEvaluationStats({
      tenantId: 't1',
      reportCategory: 'sub17',
      players: [{ id: 'p1', name: 'João', jerseyNumber: 10, category: 'sub17' }],
      from: '2026-09-01',
      to: '2026-09-30',
      matchReports: [],
      fmfMatches: [
        {
          id: 'fmf1',
          matchDate: new Date('2026-09-10T15:00:00Z'),
          playerStats: [{ playerId: 'p1', played: false, minutesPlayed: 45 }],
        },
      ],
      trainingSessions: [
        {
          sessionDate: '2026-09-05',
          status: 'finalizado',
          category: 'sub17',
          startTime: '08:00',
          endTime: '09:30',
          activities: [],
          playerEntries: [{ playerId: 'p1', available: true }],
        },
      ],
    });
    expect(stats[0]?.gamesMinutes).toBe(45);
    expect(stats[0]?.trainingMinutes).toBe(90);
  });
});

describe('buildSquadPlayerPeriodMinutes — dedupe', () => {
  it('não duplica jogo FMF + pós-jogo', () => {
    const map = buildSquadPlayerPeriodMinutes({
      tenantId: 't1',
      squadPlayerIds: ['p1'],
      reportCategory: 'sub17',
      from: '2026-09-01',
      to: '2026-09-30',
      fmfMatches: [],
      coachMatchReports: [
        {
          id: 'cr1',
          matchDate: new Date('2026-09-10T15:00:00Z'),
          status: 'finalizado',
          fmfMatchReportId: 'fmf1',
          travelLogisticsId: null,
          playerRatings: [{ playerId: 'p1', rating: 4 }],
          fmfMatchReport: {
            id: 'fmf1',
            matchDate: new Date('2026-09-10T15:00:00Z'),
            playerStats: [{ playerId: 'p1', played: true, minutesPlayed: 70 }],
          },
        },
      ],
      trainingSessions: [],
    });
    const row = map.get('p1');
    expect(row?.gamesCount).toBe(1);
    expect(row?.gamesMinutes).toBe(70);
  });
});
