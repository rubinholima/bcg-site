import {
  applyValidatedMatchRepair,
  applyValidatedRepairPlan,
  assertAllowlistScope,
  computeDisciplineSourceFingerprint,
  planFmfDisciplineScopeRepair,
  PRODUCTION_DISCIPLINE_REPAIR_ALLOWLIST,
} from './fmf-discipline-scope-repair.util';
import { patchRawParsedDisciplineOnly } from './fmf-discipline-raw-parsed-patch.util';
import type { ParsedFmfMatchReport } from './fmf-match-report.parser';

const ALLOWED_MATCH = 'cmt26oqqc0062p85b2q6ubovq';

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
  playerGoalEvents: [{ teamSide: 'away', jerseyNumber: 7, clock: '10:00', period: '1T', minute: 10, excerpt: 'gol', goalType: 'normal' }],
  substitutionEvents: [{ teamSide: 'away', outJerseyNumber: 8, inJerseyNumber: 7, outCbfRegistration: null, inCbfRegistration: null, outSourceName: 'A', inSourceName: 'B', clock: 'INT', period: 'INT', sourceTimingMarker: 'INT', absoluteMinute: 45, excerpt: 'sub' }],
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

  const existingRaw = {
    ...parsedBostonAway(),
    stats: existingStats.map((row) => ({
      teamSide: 'away' as const,
      jerseyNumber: row.jerseyNumber,
      cbfRegistration: row.cbfRegistration,
      sourceName: row.playerName,
      starter: row.starter,
      played: row.played,
      enteredMinute: row.enteredMinute,
      exitedMinute: row.exitedMinute,
      minutesPlayed: row.minutesPlayed,
      goals: row.goals,
      ownGoals: row.ownGoals,
      penaltyGoals: row.penaltyGoals,
      yellowCards: row.yellowCards,
      redCards: row.redCards,
    })),
    playerCardEvents: [{ kind: 'yellow', teamSide: 'away', jerseyNumber: 3, cbfRegistration: '964959', sourceName: 'Marcos', clock: '32:00', period: '2T', minute: 32, excerpt: 'old' }],
  };

  const players = [
    { id: 'player-marcos', name: 'Marcos Luiz Fernandes Silva', cbfRegistration: '964959', registrationProfile: null },
    { id: 'player-other', name: 'Outro Atleta', cbfRegistration: '111111', registrationProfile: null },
  ];

  return {
    tenant: {
      findUnique: async () => ({ id: 't1', name: 'Boston City', tradeName: 'Boston City', slug: 'boston' }),
    },
    fmfMatchReport: {
      findMany: async () => [
        {
          id: ALLOWED_MATCH,
          externalMatchId: '45104',
          competition: 'SUB 13',
          homeTeam: 'ATHLETIC',
          awayTeam: 'Boston City',
          matchDate: new Date('2026-05-31'),
          sourceUrl: 'https://example.com/s.pdf',
          rawParsed: existingRaw,
          occurrencesText: 'ok',
          playerStats: existingStats,
          matchOfficialEvents: [
            { id: 'e1', factType: 'PLAYER_YELLOW_CARD', provenance: 'fmf_official', externalKey: 'k1', playerId: 'player-marcos', technicalStaffId: null, sourceClock: '32:00', period: '2T', sourceSections: ['Cartões Amarelos'], sourceExcerpt: 'old' },
            { id: 'goal-1', factType: 'PLAYER_GOAL', provenance: 'fmf_official', externalKey: 'goal-key', playerId: 'player-other', technicalStaffId: null, sourceClock: '10:00', period: '1T', sourceSections: ['Gols'], sourceExcerpt: 'gol' },
          ],
          coachStatOverride: null,
        },
      ],
      findFirst: async () => ({
        id: ALLOWED_MATCH,
        tenantId: 't1',
        sourceUrl: 'https://example.com/s.pdf',
        rawParsed: existingRaw,
        coachStatOverride: null,
        playerStats: existingStats,
        matchOfficialEvents: [
          { id: 'e1', factType: 'PLAYER_YELLOW_CARD', provenance: 'fmf_official', externalKey: 'k1', playerId: 'player-marcos', technicalStaffId: null, sourceClock: '32:00', period: '2T', sourceSections: ['Cartões Amarelos'], sourceExcerpt: 'old' },
          { id: 'goal-1', factType: 'PLAYER_GOAL', provenance: 'fmf_official', externalKey: 'goal-key', playerId: 'player-other', technicalStaffId: null, sourceClock: '10:00', period: '1T', sourceSections: ['Gols'], sourceExcerpt: 'gol' },
        ],
      }),
    },
    player: { findMany: async () => players },
    technicalStaff: { findMany: async () => [] },
    fmfPlayerMatchStat: {
      update: jest.fn(async () => ({})),
      findUnique: async ({ where }: { where: { id: string } }) =>
        existingStats.find((row) => row.id === where.id) ?? null,
    },
    matchOfficialEvent: {
      create: jest.fn(async () => ({})),
      update: jest.fn(async () => ({})),
      delete: jest.fn(async () => ({})),
    },
    $transaction: async (fn: (tx: unknown) => Promise<void>) =>
      fn({
        fmfPlayerMatchStat: {
          update: jest.fn(async () => ({})),
          findUnique: async ({ where }: { where: { id: string } }) =>
            existingStats.find((row) => row.id === where.id) ?? null,
        },
        fmfMatchReport: { update: jest.fn(async () => ({})) },
        matchOfficialEvent: {
          create: jest.fn(async () => ({})),
          update: jest.fn(async () => ({})),
          delete: jest.fn(async () => ({})),
        },
      }),
    ...overrides,
  } as never;
}

describe('planFmfDisciplineScopeRepair', () => {
  it('dry-run não muta o banco', async () => {
    const update = jest.fn();
    const prisma = basePrisma();
    (prisma as { fmfPlayerMatchStat: { update: jest.Mock } }).fmfPlayerMatchStat.update = update;

    await planFmfDisciplineScopeRepair(prisma, {
      tenantId: 't1',
      matchIds: [ALLOWED_MATCH],
      downloadAndParse: async () => parsedBostonAway(),
      skipAllowlistForTests: true,
    });

    expect(update).not.toHaveBeenCalled();
  });

  it('allowlist rejeita terceira partida', () => {
    expect(() =>
      assertAllowlistScope({ tenantId: 't1', matchIds: ['forbidden-id'] }),
    ).toThrow(/allowlist/);
    expect(PRODUCTION_DISCIPLINE_REPAIR_ALLOWLIST).toHaveLength(2);
  });

  it('enumera eventOperations CREATE/UPDATE/DELETE', async () => {
    const plan = await planFmfDisciplineScopeRepair(basePrisma(), {
      tenantId: 't1',
      matchIds: [ALLOWED_MATCH],
      downloadAndParse: async () => parsedBostonAway(),
      skipAllowlistForTests: true,
    });
    const match = plan.matches[0]!;
    expect(match.eventOperations.length).toBeGreaterThan(0);
    expect(match.eventOperations.every((op) => ['CREATE', 'UPDATE', 'DELETE'].includes(op.op))).toBe(true);
    expect(match.nonDisciplineEventSnapshot.some((e) => e.factType === 'PLAYER_GOAL')).toBe(true);
  });

  it('patch rawParsed preserva gols/substituições', () => {
    const existing = parsedBostonAway();
    existing.stats[0]!.yellowCards = 1;
    const patch = patchRawParsedDisciplineOnly(existing, parsedBostonAway(), 'away');
    expect(patch.patchedRaw.playerGoalEvents).toHaveLength(1);
    expect(patch.patchedRaw.substitutionEvents).toHaveLength(1);
    expect(patch.unrelatedFingerprint.before).toBe(patch.unrelatedFingerprint.after);
  });

  it('bloqueia partida com rawParsed ausente ou inválido sem mutar', async () => {
    const update = jest.fn();
    const prismaMissing = basePrisma({
      fmfMatchReport: {
        findMany: async () => {
          const rows = await basePrisma().fmfMatchReport.findMany();
          return rows.map((row) => ({ ...row, rawParsed: null }));
        },
      },
      fmfPlayerMatchStat: { update },
    });
    const planMissing = await planFmfDisciplineScopeRepair(prismaMissing, {
      tenantId: 't1',
      matchIds: [ALLOWED_MATCH],
      downloadAndParse: async () => parsedBostonAway(),
      skipAllowlistForTests: true,
    });
    expect(planMissing.matches[0]?.safe).toBe(false);
    expect(planMissing.matches[0]?.blockReasons.join(' ')).toMatch(/rawParsed existente ausente/);

    const prismaInvalid = basePrisma({
      fmfMatchReport: {
        findMany: async () => {
          const rows = await basePrisma().fmfMatchReport.findMany();
          return rows.map((row) => ({ ...row, rawParsed: { invalid: true } }));
        },
      },
      fmfPlayerMatchStat: { update },
    });
    const planInvalid = await planFmfDisciplineScopeRepair(prismaInvalid, {
      tenantId: 't1',
      matchIds: [ALLOWED_MATCH],
      downloadAndParse: async () => parsedBostonAway(),
      skipAllowlistForTests: true,
    });
    expect(planInvalid.matches[0]?.safe).toBe(false);
    expect(planInvalid.matches[0]?.blockReasons.join(' ')).toMatch(/rawParsed existente inválido/);
    expect(update).not.toHaveBeenCalled();
  });

  it('bloqueia fonte incompleta', async () => {
    const parsed = parsedBostonAway();
    parsed.stats = parsed.stats.filter((s) => s.cbfRegistration !== '111111');
    const plan = await planFmfDisciplineScopeRepair(basePrisma(), {
      tenantId: 't1',
      matchIds: [ALLOWED_MATCH],
      downloadAndParse: async () => parsed,
      skipAllowlistForTests: true,
    });
    expect(plan.matches[0]?.safe).toBe(false);
  });
});

describe('applyValidatedRepairPlan', () => {
  it('aborta sem planFingerprint', async () => {
    await expect(
      applyValidatedRepairPlan(basePrisma(), {
        tenant: { id: 't1', name: 'Boston City', tradeName: 'Boston City', slug: 'boston', aliases: ['boston'] },
        reviewedPlanFingerprint: '',
        tenantId: 't1',
        matchIds: [ALLOWED_MATCH],
        downloadAndParse: async () => parsedBostonAway(),
        skipAllowlistForTests: true,
      }),
    ).rejects.toThrow(/planFingerprint/);
  });

  it('aborta com planFingerprint errado', async () => {
    const plan = await planFmfDisciplineScopeRepair(basePrisma(), {
      tenantId: 't1',
      matchIds: [ALLOWED_MATCH],
      downloadAndParse: async () => parsedBostonAway(),
      skipAllowlistForTests: true,
    });
    await expect(
      applyValidatedRepairPlan(basePrisma(), {
        tenant: { id: 't1', name: 'Boston City', tradeName: 'Boston City', slug: 'boston', aliases: ['boston'] },
        reviewedPlanFingerprint: 'wrong-fingerprint',
        tenantId: 't1',
        matchIds: [ALLOWED_MATCH],
        downloadAndParse: async () => parsedBostonAway(),
        skipAllowlistForTests: true,
      }),
    ).rejects.toThrow(/planFingerprint divergiu/);
    expect(plan.planFingerprint).not.toBe('wrong-fingerprint');
  });

  it('aborta quando stat stale', async () => {
    const plan = await planFmfDisciplineScopeRepair(basePrisma(), {
      tenantId: 't1',
      matchIds: [ALLOWED_MATCH],
      downloadAndParse: async () => parsedBostonAway(),
      skipAllowlistForTests: true,
    });
    const stalePrisma = basePrisma({
      fmfMatchReport: {
        findFirst: async () => {
          const base = await basePrisma().fmfMatchReport.findFirst();
          return {
            ...base,
            playerStats: base!.playerStats.map((row) =>
              row.id === 'stat-marcos' ? { ...row, yellowCards: 99 } : row,
            ),
          };
        },
      },
    });
    await expect(
      applyValidatedMatchRepair(stalePrisma, {
        tenant: { id: 't1', name: 'Boston City', tradeName: 'Boston City', slug: 'boston', aliases: ['boston'] },
        validatedMatch: plan.matches[0]!,
        downloadAndParse: async () => parsedBostonAway(),
        skipPlanRegeneration: true,
      }),
    ).rejects.toThrow(/stale/);
  });

  it('aborta quando evento manual aparece', async () => {
    const plan = await planFmfDisciplineScopeRepair(basePrisma(), {
      tenantId: 't1',
      matchIds: [ALLOWED_MATCH],
      downloadAndParse: async () => parsedBostonAway(),
      skipAllowlistForTests: true,
    });
    const manualPrisma = basePrisma({
      fmfMatchReport: {
        findFirst: async () => {
          const base = await basePrisma().fmfMatchReport.findFirst();
          return {
            ...base!,
            matchOfficialEvents: [
              ...base!.matchOfficialEvents,
              { id: 'manual-1', factType: 'PLAYER_YELLOW_CARD', provenance: 'manual', externalKey: 'manual', playerId: null, technicalStaffId: null, sourceClock: null, period: null, sourceSections: null, sourceExcerpt: null },
            ],
          };
        },
      },
    });
    await expect(
      applyValidatedMatchRepair(manualPrisma, {
        tenant: { id: 't1', name: 'Boston City', tradeName: 'Boston City', slug: 'boston', aliases: ['boston'] },
        validatedMatch: plan.matches[0]!,
        downloadAndParse: async () => parsedBostonAway(),
        skipPlanRegeneration: true,
      }),
    ).rejects.toThrow(/manuais/);
  });

  it('aborta quando rawParsed disciplinar stale', async () => {
    const plan = await planFmfDisciplineScopeRepair(basePrisma(), {
      tenantId: 't1',
      matchIds: [ALLOWED_MATCH],
      downloadAndParse: async () => parsedBostonAway(),
      skipAllowlistForTests: true,
    });
    const stalePrisma = basePrisma({
      fmfMatchReport: {
        findFirst: async () => {
          const base = await basePrisma().fmfMatchReport.findFirst();
          const raw = { ...(base!.rawParsed as object), playerCardEvents: [] };
          return { ...base!, rawParsed: raw };
        },
      },
    });
    await expect(
      applyValidatedMatchRepair(stalePrisma, {
        tenant: { id: 't1', name: 'Boston City', tradeName: 'Boston City', slug: 'boston', aliases: ['boston'] },
        validatedMatch: plan.matches[0]!,
        downloadAndParse: async () => parsedBostonAway(),
        skipPlanRegeneration: true,
      }),
    ).rejects.toThrow(/rawParsed disciplinar stale/);
  });

  it('aborta quando evento disciplinar oficial mudou', async () => {
    const plan = await planFmfDisciplineScopeRepair(basePrisma(), {
      tenantId: 't1',
      matchIds: [ALLOWED_MATCH],
      downloadAndParse: async () => parsedBostonAway(),
      skipAllowlistForTests: true,
    });
    const stalePrisma = basePrisma({
      fmfMatchReport: {
        findFirst: async () => {
          const base = await basePrisma().fmfMatchReport.findFirst();
          return {
            ...base!,
            matchOfficialEvents: base!.matchOfficialEvents.map((event) =>
              event.id === 'e1'
                ? { ...event, sourceClock: '99:99', period: '2T' }
                : event,
            ),
          };
        },
      },
    });
    await expect(
      applyValidatedMatchRepair(stalePrisma, {
        tenant: { id: 't1', name: 'Boston City', tradeName: 'Boston City', slug: 'boston', aliases: ['boston'] },
        validatedMatch: plan.matches[0]!,
        downloadAndParse: async () => parsedBostonAway(),
        skipPlanRegeneration: true,
      }),
    ).rejects.toThrow(/stale/);
  });

  it('apply executa exatamente mutações listadas sem tocar gols', async () => {
    const plan = await planFmfDisciplineScopeRepair(basePrisma(), {
      tenantId: 't1',
      matchIds: [ALLOWED_MATCH],
      downloadAndParse: async () => parsedBostonAway(),
      skipAllowlistForTests: true,
    });
    const statUpdate = jest.fn(async () => ({}));
    const eventCreate = jest.fn(async () => ({}));
    const eventUpdate = jest.fn(async () => ({}));
    const eventDelete = jest.fn(async () => ({}));
    const reportUpdate = jest.fn(async () => ({}));
    const prisma = basePrisma({
      $transaction: async (fn: (tx: unknown) => Promise<void>) =>
        fn({
          fmfPlayerMatchStat: {
            update: statUpdate,
            findUnique: async ({ where }: { where: { id: string } }) => {
              const rows = [
                {
                  id: 'stat-marcos',
                  goals: 0,
                  ownGoals: 0,
                  penaltyGoals: 0,
                  played: true,
                  starter: true,
                  minutesPlayed: 68,
                  enteredMinute: 0,
                  exitedMinute: null,
                  jerseyNumber: 3,
                },
                {
                  id: 'stat-other',
                  goals: 1,
                  ownGoals: 0,
                  penaltyGoals: 0,
                  played: true,
                  starter: false,
                  minutesPlayed: 58,
                  enteredMinute: 10,
                  exitedMinute: null,
                  jerseyNumber: 7,
                },
              ];
              return rows.find((row) => row.id === where.id) ?? null;
            },
          },
          fmfMatchReport: { update: reportUpdate },
          matchOfficialEvent: {
            create: eventCreate,
            update: eventUpdate,
            delete: eventDelete,
          },
        }),
    });

    const result = await applyValidatedMatchRepair(prisma, {
      tenant: { id: 't1', name: 'Boston City', tradeName: 'Boston City', slug: 'boston', aliases: ['boston'] },
      validatedMatch: plan.matches[0]!,
      downloadAndParse: async () => parsedBostonAway(),
      skipPlanRegeneration: true,
    });

    expect(statUpdate).toHaveBeenCalledWith({
      where: { id: 'stat-marcos' },
      data: { yellowCards: 2, redCards: 0 },
    });
    expect(eventCreate.mock.calls.length + eventUpdate.mock.calls.length + eventDelete.mock.calls.length).toBe(
      plan.matches[0]!.eventOperations.length,
    );
    expect(result.statUpdatesApplied).toBe(1);
    expect(eventDelete).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'goal-1' } }),
    );
  });

  it('falha no meio da transação aborta o repair da partida', async () => {
    const plan = await planFmfDisciplineScopeRepair(basePrisma(), {
      tenantId: 't1',
      matchIds: [ALLOWED_MATCH],
      downloadAndParse: async () => parsedBostonAway(),
      skipAllowlistForTests: true,
    });
    const prisma = basePrisma({
      $transaction: async (fn: (tx: unknown) => Promise<void>) =>
        fn({
          fmfPlayerMatchStat: {
            update: jest.fn(async () => {
              throw new Error('rollback-simulado');
            }),
            findUnique: async () => null,
          },
          fmfMatchReport: { update: jest.fn(async () => ({})) },
          matchOfficialEvent: {
            create: jest.fn(async () => ({})),
            update: jest.fn(async () => ({})),
            delete: jest.fn(async () => ({})),
          },
        }),
    });
    await expect(
      applyValidatedMatchRepair(prisma, {
        tenant: { id: 't1', name: 'Boston City', tradeName: 'Boston City', slug: 'boston', aliases: ['boston'] },
        validatedMatch: plan.matches[0]!,
        downloadAndParse: async () => parsedBostonAway(),
        skipPlanRegeneration: true,
      }),
    ).rejects.toThrow('rollback-simulado');
  });

  it('segundo dry-run idempotente quando já reparado', async () => {
    const parsed = parsedBostonAway();
    const syncedStats = [
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
    ];
    const prisma = basePrisma({
      fmfMatchReport: {
        findMany: async () => [
          {
            id: ALLOWED_MATCH,
            externalMatchId: '45104',
            competition: 'SUB 13',
            homeTeam: 'ATHLETIC',
            awayTeam: 'Boston City',
            matchDate: new Date('2026-05-31'),
            sourceUrl: 'https://example.com/s.pdf',
            rawParsed: parsed,
            occurrencesText: 'ok',
            playerStats: syncedStats,
            matchOfficialEvents: [],
            coachStatOverride: null,
          },
        ],
      },
    });
    const plan = await planFmfDisciplineScopeRepair(prisma, {
      tenantId: 't1',
      matchIds: [ALLOWED_MATCH],
      downloadAndParse: async () => parsed,
      skipAllowlistForTests: true,
    });
    expect(plan.matches[0]?.statUpdates).toHaveLength(0);
  });
});

describe('computeDisciplineSourceFingerprint', () => {
  it('é determinístico', () => {
    const parsed = parsedBostonAway();
    const a = computeDisciplineSourceFingerprint(parsed, 'away');
    const b = computeDisciplineSourceFingerprint(parsed, 'away');
    expect(a).toBe(b);
  });
});
