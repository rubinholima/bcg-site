import {
  applyValidatedMatchRepair,
  assertAllowlistScope,
  computeDisciplineSourceFingerprint,
  planFmfDisciplineScopeRepair,
  PRODUCTION_DISCIPLINE_REPAIR_ALLOWLIST,
} from './fmf-discipline-scope-repair.util';
import type { ParsedFmfMatchReport } from './fmf-match-report.parser';

const parsedBostonAway = (): ParsedFmfMatchReport => ({
  homeTeam: 'ATHLETIC CLUB',
  awayTeam: 'BOSTON CITY FUTEBOL CLUBE SAF',
  competition: 'SUB 13',
  category: 'sub13',
  season: 2026,
  phase: null,
  round: 5,
  homeScore: 1,
  awayScore: 0,
  firstHalfMinutes: 45,
  secondHalfMinutes: 45,
  totalMinutes: 90,
  occurrencesText: 'ok',
  occurrences: [],
  roster: [],
  staffRoster: [],
  playerGoalEvents: [],
  substitutionEvents: [],
  stats: [
    {
      teamSide: 'away',
      jerseyNumber: 3,
      cbfRegistration: '964959',
      sourceName: 'Marcos Luiz',
      starter: true,
      played: true,
      enteredMinute: 0,
      exitedMinute: null,
      minutesPlayed: 68,
      goals: 0,
      ownGoals: 0,
      penaltyGoals: 0,
      yellowCards: 2,
      redCards: 0,
    },
    {
      teamSide: 'away',
      jerseyNumber: 7,
      cbfRegistration: '111111',
      sourceName: 'Outro Atleta',
      starter: false,
      played: true,
      enteredMinute: 10,
      exitedMinute: null,
      minutesPlayed: 58,
      goals: 1,
      ownGoals: 0,
      penaltyGoals: 0,
      yellowCards: 0,
      redCards: 0,
    },
  ],
  playerCardEvents: [
    {
      kind: 'yellow',
      teamSide: 'away',
      jerseyNumber: 3,
      cbfRegistration: '964959',
      sourceName: 'Marcos Luiz',
      clock: '32:00',
      period: '2T',
      minute: 32,
      excerpt: 'y1',
    },
    {
      kind: 'yellow',
      teamSide: 'away',
      jerseyNumber: 3,
      cbfRegistration: '964959',
      sourceName: 'Marcos Luiz',
      clock: 'TER',
      period: 'TER',
      minute: 68,
      excerpt: 'y2',
      expulsionBySecondYellow: true,
    },
  ],
  staffCardEvents: [],
});

function basePrisma(overrides: Record<string, unknown> = {}) {
  const existingStats = [
    {
      id: 'stat-marcos',
      playerId: 'player-marcos',
      playerName: 'Marcos Luiz',
      cbfRegistration: '964959',
      jerseyNumber: 3,
      starter: true,
      played: true,
      enteredMinute: 0,
      exitedMinute: null,
      minutesPlayed: 68,
      goals: 0,
      ownGoals: 0,
      penaltyGoals: 0,
      yellowCards: 1,
      redCards: 0,
    },
    {
      id: 'stat-other',
      playerId: 'player-other',
      playerName: 'Outro Atleta',
      cbfRegistration: '111111',
      jerseyNumber: 7,
      starter: false,
      played: true,
      enteredMinute: 10,
      exitedMinute: null,
      minutesPlayed: 58,
      goals: 1,
      ownGoals: 0,
      penaltyGoals: 0,
      yellowCards: 0,
      redCards: 0,
    },
  ];

  const players = [
    {
      id: 'player-marcos',
      name: 'Marcos Luiz Fernandes Silva',
      cbfRegistration: '964959',
      registrationProfile: null,
    },
    {
      id: 'player-other',
      name: 'Outro Atleta',
      cbfRegistration: '111111',
      registrationProfile: null,
    },
  ];

  return {
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
          externalMatchId: '45104',
          competition: 'SUB 13',
          homeTeam: 'ATHLETIC',
          awayTeam: 'Boston City',
          matchDate: new Date('2026-05-31'),
          sourceUrl: 'https://example.com/s.pdf',
          rawParsed: { stats: [], playerCardEvents: [] },
          occurrencesText: 'old',
          playerStats: existingStats,
          matchOfficialEvents: [
            { factType: 'PLAYER_YELLOW_CARD', provenance: 'fmf_official' },
          ],
          coachStatOverride: null,
        },
      ],
      findFirst: async () => ({
        id: 'm1',
        tenantId: 't1',
        sourceUrl: 'https://example.com/s.pdf',
        coachStatOverride: null,
        playerStats: existingStats,
      }),
    },
    player: { findMany: async () => players },
    technicalStaff: { findMany: async () => [] },
    fmfPlayerMatchStat: {
      update: jest.fn(async () => ({})),
      findUnique: async ({ where }: { where: { id: string } }) =>
        existingStats.find((row) => row.id === where.id) ?? null,
    },
    $transaction: async (fn: (tx: unknown) => Promise<void>) => fn({
      fmfPlayerMatchStat: {
        update: jest.fn(async () => ({})),
        findUnique: async ({ where }: { where: { id: string } }) =>
          existingStats.find((row) => row.id === where.id) ?? null,
      },
      fmfMatchReport: { update: jest.fn(async () => ({})) },
    }),
    ...overrides,
  } as never;
}

describe('planFmfDisciplineScopeRepair', () => {
  it('dry-run não muta o banco', async () => {
    const update = jest.fn();
    const deleteMany = jest.fn();
    const prisma = basePrisma();
    (prisma as { fmfPlayerMatchStat: { update: jest.Mock; deleteMany: jest.Mock } }).fmfPlayerMatchStat =
      { update, deleteMany };
    (prisma as { fmfMatchReport: { update: jest.Mock } }).fmfMatchReport.update = jest.fn();

    await planFmfDisciplineScopeRepair(prisma, {
      tenantId: 't1',
      matchIds: ['m1'],
      downloadAndParse: async () => parsedBostonAway(),
    });

    expect(update).not.toHaveBeenCalled();
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('bloqueia partida com CoachMatchStatOverride', async () => {
    const prisma = basePrisma({
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
            rawParsed: {},
            occurrencesText: null,
            playerStats: [],
            matchOfficialEvents: [],
            coachStatOverride: { id: 'override-1' },
          },
        ],
      },
    });

    const plan = await planFmfDisciplineScopeRepair(prisma, {
      tenantId: 't1',
      matchIds: ['m1'],
      downloadAndParse: async () => parsedBostonAway(),
    });

    expect(plan.matches[0]?.safe).toBe(false);
    expect(plan.matches[0]?.blockReasons[0]).toContain('CoachMatchStatOverride');
  });

  it('bloqueia fonte incompleta quando participante some do PDF', async () => {
    const parsed = parsedBostonAway();
    parsed.stats = parsed.stats.filter((stat) => stat.cbfRegistration !== '111111');

    const plan = await planFmfDisciplineScopeRepair(basePrisma(), {
      tenantId: 't1',
      matchIds: ['m1'],
      downloadAndParse: async () => parsed,
    });

    expect(plan.matches[0]?.safe).toBe(false);
    expect(plan.matches[0]?.blockReasons.some((r) => r.includes('fonte incompleta'))).toBe(true);
  });

  it('diff completo inclui apenas campos disciplinares mutáveis', async () => {
    const plan = await planFmfDisciplineScopeRepair(basePrisma(), {
      tenantId: 't1',
      matchIds: ['m1'],
      downloadAndParse: async () => parsedBostonAway(),
    });

    const match = plan.matches[0]!;
    expect(match.statUpdates).toHaveLength(1);
    expect(match.statUpdates[0]).toMatchObject({
      statId: 'stat-marcos',
      yellowCards: { before: 1, after: 2 },
      redCards: { before: 0, after: 0 },
    });
    expect(match.preservedStats.find((row) => row.statId === 'stat-other')?.goals).toBe(1);
  });

  it('allowlist de produção rejeita matchId fora do escopo', () => {
    expect(() =>
      assertAllowlistScope({ tenantId: 't1', matchIds: ['forbidden-id'] }),
    ).toThrow(/allowlist/);
    expect(PRODUCTION_DISCIPLINE_REPAIR_ALLOWLIST).toHaveLength(2);
  });
});

describe('applyValidatedMatchRepair', () => {
  it('aplica somente campos disciplinares e preserva gols/minutos', async () => {
    const statUpdates: Array<Record<string, unknown>> = [];
    const existingStats = [
      {
        id: 'stat-marcos',
        playerId: 'player-marcos',
        playerName: 'Marcos Luiz',
        cbfRegistration: '964959',
        jerseyNumber: 3,
        starter: true,
        played: true,
        enteredMinute: 0,
        exitedMinute: null,
        minutesPlayed: 68,
        goals: 0,
        ownGoals: 0,
        penaltyGoals: 0,
        yellowCards: 1,
        redCards: 0,
      },
    ];
    const parsed = parsedBostonAway();
    const fingerprint = computeDisciplineSourceFingerprint(parsed, 'away');
    const prisma = basePrisma({
      fmfPlayerMatchStat: {
        update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          statUpdates.push(data);
        }),
        findUnique: async ({ where }: { where: { id: string } }) =>
          existingStats.find((row) => row.id === where.id) ?? null,
      },
      $transaction: async (fn: (tx: unknown) => Promise<void>) =>
        fn({
          fmfPlayerMatchStat: {
            update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
              statUpdates.push(data);
            }),
            findUnique: async ({ where }: { where: { id: string } }) =>
              existingStats.find((row) => row.id === where.id) ?? null,
          },
          fmfMatchReport: { update: jest.fn(async () => ({})) },
        }),
    });

    const plan = await planFmfDisciplineScopeRepair(basePrisma(), {
      tenantId: 't1',
      matchIds: ['m1'],
      downloadAndParse: async () => parsed,
    });

    const validatedMatch = {
      ...plan.matches[0]!,
      eventMutations: { ...plan.matches[0]!.eventMutations, willMutate: false },
    };

    await applyValidatedMatchRepair(prisma, {
      tenant: {
        id: 't1',
        name: 'Boston City',
        tradeName: 'Boston City',
        slug: 'boston',
        aliases: ['boston'],
      },
      validatedMatch,
      downloadAndParse: async () => parsed,
    });

    expect(statUpdates).toEqual([{ yellowCards: 2, redCards: 0 }]);
    expect(Object.keys(statUpdates[0] ?? {})).toEqual(['yellowCards', 'redCards']);
  });

  it('aborta quando fingerprint diverge (TOCTOU)', async () => {
    const parsed = parsedBostonAway();
    const plan = await planFmfDisciplineScopeRepair(basePrisma(), {
      tenantId: 't1',
      matchIds: ['m1'],
      downloadAndParse: async () => parsed,
    });

    const mutated = parsedBostonAway();
    mutated.playerCardEvents = [];

    await expect(
      applyValidatedMatchRepair(basePrisma(), {
        tenant: {
          id: 't1',
          name: 'Boston City',
          tradeName: 'Boston City',
          slug: 'boston',
          aliases: ['boston'],
        },
        validatedMatch: plan.matches[0]!,
        downloadAndParse: async () => mutated,
      }),
    ).rejects.toThrow(/fingerprint divergiu/);
  });

  it('rollback quando mutação stat falha dentro da transação', async () => {
    const parsed = parsedBostonAway();
    const plan = await planFmfDisciplineScopeRepair(basePrisma(), {
      tenantId: 't1',
      matchIds: ['m1'],
      downloadAndParse: async () => parsed,
    });

    const prisma = basePrisma({
      $transaction: async (fn: (tx: unknown) => Promise<void>) =>
        fn({
          fmfPlayerMatchStat: {
            update: jest.fn(async () => {
              throw new Error('falha simulada');
            }),
            findUnique: async () => null,
          },
          fmfMatchReport: { update: jest.fn() },
        }),
    });

    await expect(
      applyValidatedMatchRepair(prisma, {
        tenant: {
          id: 't1',
          name: 'Boston City',
          tradeName: 'Boston City',
          slug: 'boston',
          aliases: ['boston'],
        },
        validatedMatch: plan.matches[0]!,
        downloadAndParse: async () => parsed,
      }),
    ).rejects.toThrow(/falha simulada/);
  });

  it('segundo dry-run idempotente após plano sem mudanças pendentes', async () => {
    const parsed = parsedBostonAway();
    const prisma = basePrisma({
      fmfMatchReport: {
        findMany: async () => [
          {
            id: 'm1',
            externalMatchId: '45104',
            competition: 'SUB 13',
            homeTeam: 'ATHLETIC',
            awayTeam: 'Boston City',
            matchDate: new Date('2026-05-31'),
            sourceUrl: 'https://example.com/s.pdf',
            rawParsed: parsed,
            occurrencesText: 'ok',
            playerStats: [
              {
                id: 'stat-marcos',
                playerId: 'player-marcos',
                playerName: 'Marcos Luiz',
                cbfRegistration: '964959',
                jerseyNumber: 3,
                starter: true,
                played: true,
                enteredMinute: 0,
                exitedMinute: null,
                minutesPlayed: 68,
                goals: 0,
                ownGoals: 0,
                penaltyGoals: 0,
                yellowCards: 2,
                redCards: 0,
              },
              {
                id: 'stat-other',
                playerId: 'player-other',
                playerName: 'Outro Atleta',
                cbfRegistration: '111111',
                jerseyNumber: 7,
                starter: false,
                played: true,
                enteredMinute: 10,
                exitedMinute: null,
                minutesPlayed: 58,
                goals: 1,
                ownGoals: 0,
                penaltyGoals: 0,
                yellowCards: 0,
                redCards: 0,
              },
            ],
            matchOfficialEvents: [
              { factType: 'PLAYER_YELLOW_CARD', provenance: 'fmf_official' },
              { factType: 'PLAYER_YELLOW_CARD', provenance: 'fmf_official' },
            ],
            coachStatOverride: null,
          },
        ],
      },
    });

    const plan = await planFmfDisciplineScopeRepair(prisma, {
      tenantId: 't1',
      matchIds: ['m1'],
      downloadAndParse: async () => parsed,
    });

    expect(plan.matches[0]?.statUpdates).toHaveLength(0);
    expect(plan.matches[0]?.safe).toBe(true);
  });
});
