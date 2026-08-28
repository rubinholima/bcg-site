import { buildPersonalDisciplineHistory } from './personal-discipline-history.util';
import { buildDisciplineGrid } from './cartoes-suspensao.util';

const club = { clubName: 'Boston City', aliases: [] as string[] };
const categoryLabels = { u15: 'Sub-15', u17: 'Sub-17', u20: 'Sub-20' };

function matchReport(overrides: Partial<{
  id: string;
  matchDate: Date;
  category: string;
  competition: string;
  season: number;
}>) {
  return {
    id: overrides.id ?? 'm1',
    matchDate: overrides.matchDate ?? new Date('2025-03-01'),
    homeTeam: 'Boston City',
    awayTeam: 'América-MG',
    competition: overrides.competition ?? 'Mineiro',
    season: overrides.season ?? 2025,
    phase: null,
    round: 1,
    category: overrides.category ?? 'u17',
    sourceUrl: 'https://fmf.example/s1',
  };
}

function playerCardEvent(input: {
  id: string;
  playerId?: string;
  factType?: string;
  category?: string;
  matchId?: string;
  matchDate?: Date;
  roleLabel?: string | null;
  resolutionIncluded?: boolean;
}) {
  return {
    id: input.id,
    factType: input.factType ?? 'PLAYER_YELLOW_CARD',
    sourceJerseyNumber: 10,
    sourceRoleLabel: input.roleLabel ?? null,
    sourceClock: '32',
    period: '1T',
    sourceSequence: 1,
    minute: 32,
    externalKey: input.id,
    fmfMatchReport: matchReport({
      id: input.matchId ?? `match-${input.id}`,
      category: input.category ?? 'u17',
      matchDate: input.matchDate,
    }),
  };
}

describe('buildPersonalDisciplineHistory — player', () => {
  it('A — mesmo atleta U15 + U17 → um histórico com ambos', () => {
    const result = buildPersonalDisciplineHistory({
      personId: 'p1',
      personName: 'João',
      personKind: 'player',
      events: [
        playerCardEvent({ id: 'e1', category: 'u15', matchId: 'm-u15' }),
        playerCardEvent({ id: 'e2', category: 'u17', matchId: 'm-u17' }),
      ],
      clubName: club.clubName,
      aliases: club.aliases,
      categoryLabels,
    });
    expect(result.entries).toHaveLength(2);
    expect(result.summary.yellowCards).toBe(2);
    expect(result.summary.categories.sort()).toEqual(['u15', 'u17']);
  });

  it('G — não filtra por Player.category do cadastro (query traz tudo; filtros são opcionais)', () => {
    const all = buildPersonalDisciplineHistory({
      personId: 'p1',
      personName: 'João',
      personKind: 'player',
      events: [
        playerCardEvent({ id: 'e1', category: 'u15' }),
        playerCardEvent({ id: 'e2', category: 'u20' }),
      ],
      clubName: club.clubName,
      aliases: club.aliases,
      categoryLabels,
    });
    expect(all.entries).toHaveLength(2);

    const filtered = buildPersonalDisciplineHistory({
      personId: 'p1',
      personName: 'João',
      personKind: 'player',
      events: [
        playerCardEvent({ id: 'e1', category: 'u15' }),
        playerCardEvent({ id: 'e2', category: 'u20' }),
      ],
      clubName: club.clubName,
      aliases: club.aliases,
      categoryLabels,
      filters: { category: 'u15' },
    });
    expect(filtered.entries).toHaveLength(1);
    expect(filtered.entries[0].matchCategory).toBe('u15');
  });
});

describe('buildPersonalDisciplineHistory — staff', () => {
  it('C — mesmo staff em várias categorias → um histórico', () => {
    const result = buildPersonalDisciplineHistory({
      personId: 's1',
      personName: 'José',
      personKind: 'staff',
      events: [
        {
          ...playerCardEvent({ id: 'e1', category: 'u17', matchId: 'm1' }),
          factType: 'STAFF_YELLOW_CARD',
          sourceRoleLabel: 'Auxiliar Técnico',
        },
        {
          ...playerCardEvent({ id: 'e2', category: 'u20', matchId: 'm2' }),
          factType: 'STAFF_YELLOW_CARD',
          sourceRoleLabel: 'Técnico',
        },
        {
          ...playerCardEvent({ id: 'e3', category: 'u15', matchId: 'm3' }),
          factType: 'STAFF_RED_CARD',
          sourceRoleLabel: 'Massagista',
        },
      ],
      clubName: club.clubName,
      aliases: club.aliases,
      categoryLabels,
    });
    expect(result.personId).toBe('s1');
    expect(result.entries).toHaveLength(3);
    expect(result.summary.yellowCards).toBe(2);
    expect(result.summary.redCards).toBe(1);
  });

  it('D/H — papel histórico vem do evento, não do cadastro default', () => {
    const result = buildPersonalDisciplineHistory({
      personId: 's1',
      personName: 'José',
      personKind: 'staff',
      events: [
        {
          ...playerCardEvent({ id: 'e1', category: 'u17' }),
          factType: 'STAFF_YELLOW_CARD',
          sourceRoleLabel: 'Auxiliar Técnico',
        },
        {
          ...playerCardEvent({ id: 'e2', category: 'u20' }),
          factType: 'STAFF_YELLOW_CARD',
          sourceRoleLabel: 'Técnico',
        },
      ],
      clubName: club.clubName,
      aliases: club.aliases,
      categoryLabels,
    });
    const roles = result.entries.map((e) => e.sourceRoleLabel);
    expect(roles).toContain('Auxiliar Técnico');
    expect(roles).toContain('Técnico');
    expect(roles).not.toContain('Técnico Sub-20');
  });
});

describe('personal history vs accumulation isolation', () => {
  it('B — histórico global agrega; acumulação permanece isolada por categoria', () => {
    const history = buildPersonalDisciplineHistory({
      personId: 'p1',
      personName: 'João',
      personKind: 'player',
      events: [
        ...[0, 1, 2].map((i) =>
          playerCardEvent({ id: `u17-${i}`, category: 'u17', matchId: `m-u17-${i}` }),
        ),
        playerCardEvent({ id: 'u20-1', category: 'u20', matchId: 'm-u20-1' }),
      ],
      clubName: club.clubName,
      aliases: club.aliases,
      categoryLabels,
    });
    expect(history.summary.yellowCards).toBe(4);

    const playerRow = {
      id: 'p1',
      name: 'João',
      jerseyNumber: 9,
      position: 'MEI',
      status: 'available',
      statusDetails: null,
      yellowCards: null,
      redCards: null,
      registrationProfile: null,
    };
    const matchBase = {
      homeTeam: 'Boston City',
      awayTeam: 'América',
      homeScore: 1,
      awayScore: 0,
      occurrencesText: null as string | null,
    };

    const u17Grid = buildDisciplineGrid({
      ...club,
      disciplineCategory: 'u17',
      matches: [0, 1, 2].map((i) => ({
        id: `m-u17-${i}`,
        round: i + 1,
        matchDate: new Date(`2025-0${i + 1}-01`),
        ...matchBase,
        playerStats: [
          {
            playerId: 'p1',
            jerseyNumber: 9,
            playerName: 'João',
            played: true,
            yellowCards: 1,
            redCards: 0,
          },
        ],
      })),
      players: [{ ...playerRow, category: 'u17' }],
    });

    const u20Grid = buildDisciplineGrid({
      ...club,
      disciplineCategory: 'u20',
      matches: [
        {
          id: 'm-u20-1',
          round: 1,
          matchDate: new Date('2025-04-01'),
          ...matchBase,
          playerStats: [
            {
              playerId: 'p1',
              jerseyNumber: 9,
              playerName: 'João',
              played: true,
              yellowCards: 1,
              redCards: 0,
            },
          ],
        },
      ],
      players: [{ ...playerRow, category: 'u20' }],
    });

    expect(u17Grid.players[0]?.yellowCardsTotal).toBe(3);
    expect(u20Grid.players[0]?.yellowCardsTotal).toBe(1);
    expect(u17Grid.players[0]?.nextRoundCell).toBe('S');
    expect(u20Grid.players[0]?.nextRoundCell).not.toBe('S');
  });
});

describe('unresolved events', () => {
  it('E — unresolved não entra no histórico (service filtra; util só recebe resolvidos)', () => {
    const resolvedOnly = buildPersonalDisciplineHistory({
      personId: 'p1',
      personName: 'João',
      personKind: 'player',
      events: [playerCardEvent({ id: 'resolved-1' })],
      clubName: club.clubName,
      aliases: club.aliases,
      categoryLabels,
    });
    expect(resolvedOnly.entries).toHaveLength(1);

    const emptyWhenNoResolved = buildPersonalDisciplineHistory({
      personId: 'p1',
      personName: 'João',
      personKind: 'player',
      events: [],
      clubName: club.clubName,
      aliases: club.aliases,
      categoryLabels,
    });
    expect(emptyWhenNoResolved.entries).toHaveLength(0);
    expect(emptyWhenNoResolved.summary.yellowCards).toBe(0);
  });

  it('F — após resolução upstream, cartão entra no histórico', () => {
    const before = buildPersonalDisciplineHistory({
      personId: 'p1',
      personName: 'João',
      personKind: 'player',
      events: [],
      clubName: club.clubName,
      aliases: club.aliases,
      categoryLabels,
    });
    expect(before.entries).toHaveLength(0);

    const after = buildPersonalDisciplineHistory({
      personId: 'p1',
      personName: 'João',
      personKind: 'player',
      events: [playerCardEvent({ id: 'now-resolved' })],
      clubName: club.clubName,
      aliases: club.aliases,
      categoryLabels,
    });
    expect(after.entries).toHaveLength(1);
    expect(after.entries[0].cardLabel).toBe('Amarelo');
  });
});
