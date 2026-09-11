import { planFmfDisciplineScopeRepair } from './fmf-discipline-scope-repair.util';

describe('planFmfDisciplineScopeRepair', () => {
  it('bloqueia partida com CoachMatchStatOverride', async () => {
    const prisma = {
      tenant: {
        findUnique: async () => ({
          id: 't1',
          name: 'Boston City',
          tradeName: 'Boston City',
          slug: 'boston',
        }),
      },
      fmfMatchReport: {
        findMany: async () => [
          {
            id: 'm1',
            externalMatchId: '1',
            competition: 'SUB 13',
            homeTeam: 'A',
            awayTeam: 'Boston City',
            matchDate: new Date('2026-05-31'),
            sourceUrl: 'https://example.com/s.pdf',
            playerStats: [],
            matchOfficialEvents: [],
            coachStatOverride: { id: 'override-1' },
          },
        ],
      },
      player: { findMany: async () => [] },
    } as never;

    const plan = await planFmfDisciplineScopeRepair(prisma, {
      tenantId: 't1',
      matchIds: ['m1'],
      downloadAndParse: async () => ({
        homeTeam: 'A',
        awayTeam: 'Boston City Futebol Clube SAF',
        stats: [],
        playerCardEvents: [],
        staffCardEvents: [],
        staffRoster: [],
        playerGoalEvents: [],
        substitutionEvents: [],
        roster: [],
        occurrences: [],
        occurrencesText: '',
        competition: 'SUB 13',
        category: 'sub13',
        season: 2026,
        phase: null,
        round: 1,
        homeScore: 1,
        awayScore: 0,
        firstHalfMinutes: 45,
        secondHalfMinutes: 45,
        totalMinutes: 90,
      }),
    });

    expect(plan.matches[0]?.safe).toBe(false);
    expect(plan.matches[0]?.blockReasons[0]).toContain('CoachMatchStatOverride');
  });
});
