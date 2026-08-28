import {
  buildDisciplineGrid,
  buildStaffDisciplineGrid,
  isFriendlyDisciplineMatch,
} from './cartoes-suspensao.util';
import {
  buildMatchDisciplineFromOfficialEvents,
  isResolvedForDisciplineAccumulation,
} from './cartoes-suspensao-events.util';
import { resolveCartoesSuspensaoSource } from './cartoes-suspensao-source.util';

const club = { clubName: 'Boston City', aliases: [] as string[] };
const matchBase = {
  homeTeam: 'Boston City',
  awayTeam: 'América-MG',
  homeScore: 1,
  awayScore: 0,
  occurrencesText: null as string | null,
};

describe('isResolvedForDisciplineAccumulation', () => {
  it('exige resolutionStatus resolved e playerId', () => {
    expect(
      isResolvedForDisciplineAccumulation({
        factType: 'PLAYER_YELLOW_CARD',
        resolutionStatus: 'unresolved',
        playerId: null,
      }),
    ).toBe(false);
    expect(
      isResolvedForDisciplineAccumulation({
        factType: 'PLAYER_YELLOW_CARD',
        resolutionStatus: 'resolved',
        playerId: 'p1',
      }),
    ).toBe(true);
    expect(
      isResolvedForDisciplineAccumulation({
        factType: 'PLAYER_YELLOW_CARD',
        resolutionStatus: 'partial',
        playerId: 'p1',
      }),
    ).toBe(false);
  });
});

describe('buildMatchDisciplineFromOfficialEvents', () => {
  it('E — cartão unresolved preservado mas não acumulado', () => {
    const result = buildMatchDisciplineFromOfficialEvents({
      events: [
        {
          factType: 'PLAYER_YELLOW_CARD',
          resolutionStatus: 'unresolved',
          playerId: null,
          sourceName: 'João Da Silva',
          sourceJerseyNumber: 17,
          sourceTeamSide: 'home',
        },
      ],
      ...matchBase,
      ...club,
    });
    expect(result.playerStats).toHaveLength(0);
    expect(result.pendingPlayerCards).toBe(1);
  });

  it('F — unresolved → resolved entra na acumulação', () => {
    const event = {
      factType: 'PLAYER_YELLOW_CARD',
      resolutionStatus: 'unresolved',
      playerId: null,
      sourceName: 'João',
      sourceJerseyNumber: 9,
      sourceTeamSide: 'home',
    };
    const pending = buildMatchDisciplineFromOfficialEvents({
      events: [event],
      ...matchBase,
      ...club,
    });
    expect(pending.playerStats).toHaveLength(0);

    const resolved = buildMatchDisciplineFromOfficialEvents({
      events: [{ ...event, resolutionStatus: 'resolved', playerId: 'joao' }],
      ...matchBase,
      ...club,
    });
    expect(resolved.playerStats).toHaveLength(1);
    expect(resolved.playerStats[0]?.yellowCards).toBe(1);
    expect(resolved.pendingPlayerCards).toBe(0);
  });

  it('G — dois amarelos oficiais permanecem dois; expulsão derivada', () => {
    const fromEvents = buildMatchDisciplineFromOfficialEvents({
      events: [
        {
          factType: 'PLAYER_YELLOW_CARD',
          resolutionStatus: 'resolved',
          playerId: 'p1',
          sourceTeamSide: 'home',
        },
        {
          factType: 'PLAYER_YELLOW_CARD',
          resolutionStatus: 'resolved',
          playerId: 'p1',
          sourceTeamSide: 'home',
        },
      ],
      ...matchBase,
      ...club,
    });
    expect(fromEvents.playerStats[0]?.yellowCards).toBe(2);

    const grid = buildDisciplineGrid({
      ...club,
      disciplineCategory: 'sub20',
      matches: [
        {
          id: 'm1',
          round: 1,
          matchDate: new Date('2026-08-01'),
          ...matchBase,
          playerStats: fromEvents.playerStats,
        },
      ],
      players: [
        {
          id: 'p1',
          name: 'Atleta',
          jerseyNumber: 9,
          position: 'MEI',
          status: 'available',
          statusDetails: null,
          yellowCards: null,
          redCards: null,
          registrationProfile: null,
        },
      ],
    });
    expect(grid.players[0]?.roundCells[0]).toBe('AV');
    expect(grid.players[0]?.nextRoundCell).toBe('S');
  });
});

describe('discipline isolation via competition grids', () => {
  const player = {
    id: 'jose',
    name: 'José Silva',
    jerseyNumber: 1,
    position: null,
    status: 'available',
    statusDetails: null,
    yellowCards: null,
    redCards: null,
    registrationProfile: null,
    category: 'sub20',
  };

  it('A — 3 amarelos mesma categoria → suspensão', () => {
    const dates = ['2026-08-01', '2026-08-08', '2026-08-15'];
    const grid = buildDisciplineGrid({
      ...club,
      disciplineCategory: 'sub17',
      matches: dates.map((d, i) => ({
        id: `m${i}`,
        round: i + 1,
        matchDate: new Date(d),
        ...matchBase,
        playerStats: [
          {
            playerId: 'jose',
            jerseyNumber: 1,
            playerName: 'José Silva',
            played: true,
            yellowCards: 1,
            redCards: 0,
          },
        ],
      })),
      players: [{ ...player, category: 'sub17' }],
    });
    expect(grid.players[0]?.yellowCardsTotal).toBe(3);
    expect(grid.players[0]?.nextRoundCell).toBe('S');
  });

  it('B — U17 e U20 acumulam independentemente', () => {
    const buildForCategory = (disciplineCategory: string, yellowInMatch: number) =>
      buildDisciplineGrid({
        ...club,
        disciplineCategory,
        matches: [
          {
            id: 'm1',
            round: 1,
            matchDate: new Date('2026-08-01'),
            ...matchBase,
            playerStats: [
              {
                playerId: 'jose',
                jerseyNumber: 1,
                playerName: 'José Silva',
                played: true,
                yellowCards: yellowInMatch,
                redCards: 0,
              },
            ],
          },
        ],
        players: [{ ...player, category: disciplineCategory }],
      });

    const u17 = buildForCategory('sub17', 1);
    const u17b = buildForCategory('sub17', 1);
    const u17twoMatches = buildDisciplineGrid({
      ...club,
      disciplineCategory: 'sub17',
      matches: [
        {
          id: 'm1',
          round: 1,
          matchDate: new Date('2026-08-01'),
          ...matchBase,
          playerStats: [
            {
              playerId: 'jose',
              jerseyNumber: 1,
              playerName: 'José Silva',
              played: true,
              yellowCards: 1,
              redCards: 0,
            },
          ],
        },
        {
          id: 'm2',
          round: 2,
          matchDate: new Date('2026-08-08'),
          ...matchBase,
          playerStats: [
            {
              playerId: 'jose',
              jerseyNumber: 1,
              playerName: 'José Silva',
              played: true,
              yellowCards: 1,
              redCards: 0,
            },
          ],
        },
      ],
      players: [{ ...player, category: 'sub17' }],
    });
    const u20 = buildForCategory('sub20', 1);
    expect(u17.players[0]?.yellowCardsTotal).toBe(1);
    expect(u17twoMatches.players[0]?.yellowCardsTotal).toBe(2);
    expect(u17twoMatches.players[0]?.nextRoundCell).toBe('P');
    expect(u20.players[0]?.yellowCardsTotal).toBe(1);
    expect(u20.players[0]?.nextRoundCell).toBe('');
    expect(u17b.players[0]?.nextRoundCell).toBe('');
  });

  it('H — vermelho U17 não contamina U20', () => {
    const u17 = buildDisciplineGrid({
      ...club,
      disciplineCategory: 'sub17',
      matches: [
        {
          id: 'm1',
          round: 1,
          matchDate: new Date('2026-08-01'),
          ...matchBase,
          playerStats: [
            {
              playerId: 'jose',
              jerseyNumber: 1,
              playerName: 'José Silva',
              played: true,
              yellowCards: 0,
              redCards: 1,
            },
          ],
        },
      ],
      players: [{ ...player, category: 'sub17' }],
    });
    const u20 = buildDisciplineGrid({
      ...club,
      disciplineCategory: 'sub20',
      matches: [
        {
          id: 'm2',
          round: 1,
          matchDate: new Date('2026-08-01'),
          ...matchBase,
          playerStats: [],
        },
      ],
      players: [{ ...player, category: 'sub20' }],
    });
    expect(u17.players[0]?.nextRoundCell).toBe('S');
    expect(u20.players[0]?.nextRoundCell).toBe('');
  });
});

describe('staff discipline events', () => {
  const staffMember = {
    id: 'jose-staff',
    name: 'José Silva',
    roleLabel: 'Técnico',
    licenseNumber: null,
  };

  it('C — mesmo staff, papéis diferentes, mesma acumulação', () => {
    const roles = ['Técnico', 'Auxiliar Técnico', 'Massagista'];
    const grid = buildStaffDisciplineGrid({
      ...club,
      staff: [staffMember],
      staffCandidates: [staffMember],
      matches: roles.map((role, i) => ({
        id: `m${i}`,
        round: i + 1,
        matchDate: new Date(`2026-08-0${i + 1}`),
        ...matchBase,
        playerStats: [],
        eventStaffCards: new Map([
          [
            'jose-staff',
            { yellowCards: 1, redCards: 0, manual: false },
          ],
        ]),
      })),
    });
    expect(grid.staff[0]?.yellowCardsTotal).toBe(3);
    expect(grid.staff[0]?.nextRoundCell).toBe('S');
  });

  it('D — U17 e U20 staff independentes', () => {
    const buildGrid = () =>
      buildStaffDisciplineGrid({
        ...club,
        staff: [staffMember],
        staffCandidates: [staffMember],
        matches: [
          {
            id: 'm1',
            round: 1,
            matchDate: new Date('2026-08-01'),
            ...matchBase,
            playerStats: [],
            eventStaffCards: new Map([
              ['jose-staff', { yellowCards: 1, redCards: 0, manual: false }],
            ]),
          },
        ],
      });

    expect(buildGrid().staff[0]?.yellowCardsTotal).toBe(1);
  });
});

describe('resolveCartoesSuspensaoSource', () => {
  it('J — auto não faz fallback por unresolved; exige sync', () => {
    const decision = resolveCartoesSuspensaoSource({
      configured: 'auto',
      matches: [
        {
          matchId: 'm1',
          rawParsedAvailable: true,
          integrityStatus: 'unresolved',
          eventCount: 4,
          isFriendly: false,
        },
      ],
    });
    expect(decision.effectiveMode).toBe('events');
  });

  it('J — fallback sem sync oficial', () => {
    const decision = resolveCartoesSuspensaoSource({
      configured: 'auto',
      matches: [
        {
          matchId: 'm1',
          rawParsedAvailable: true,
          integrityStatus: null,
          eventCount: 0,
          isFriendly: false,
        },
      ],
    });
    expect(decision.effectiveMode).toBe('legacy');
  });

  it('I — legacy mode explícito', () => {
    expect(
      resolveCartoesSuspensaoSource({
        configured: 'legacy',
        matches: [],
      }).effectiveMode,
    ).toBe('legacy');
  });
});

describe('friendly matches', () => {
  it('amistoso não altera pendurado', () => {
    expect(isFriendlyDisciplineMatch({ competition: 'Amistoso' })).toBe(true);
    const grid = buildDisciplineGrid({
      ...club,
      disciplineCategory: 'sub20',
      friendlyMatchIds: new Set(['friendly']),
      matches: [
        {
          id: 'official',
          round: 1,
          matchDate: new Date('2026-08-01'),
          ...matchBase,
          playerStats: [
            {
              playerId: 'p1',
              jerseyNumber: 9,
              playerName: 'Atleta',
              played: true,
              yellowCards: 1,
              redCards: 0,
            },
          ],
        },
        {
          id: 'official2',
          round: 2,
          matchDate: new Date('2026-08-08'),
          ...matchBase,
          playerStats: [
            {
              playerId: 'p1',
              jerseyNumber: 9,
              playerName: 'Atleta',
              played: true,
              yellowCards: 1,
              redCards: 0,
            },
          ],
        },
        {
          id: 'friendly',
          round: null,
          matchDate: new Date('2026-08-09'),
          ...matchBase,
          playerStats: [
            {
              playerId: 'p1',
              jerseyNumber: 9,
              playerName: 'Atleta',
              played: true,
              yellowCards: 1,
              redCards: 0,
            },
          ],
        },
      ],
      players: [
        {
          id: 'p1',
          name: 'Atleta',
          jerseyNumber: 9,
          position: null,
          status: 'available',
          statusDetails: null,
          yellowCards: null,
          redCards: null,
          registrationProfile: null,
        },
      ],
    });
    expect(grid.players[0]?.roundCells[0]).toBe('AV');
    expect(grid.players[0]?.roundCells[1]).toBe('AV');
    expect(grid.players[0]?.nextRoundCell).toBe('P');
    expect(grid.players[0]?.roundCells[2]).toBe('AV');
    expect(grid.players[0]?.yellowCardsTotal).toBe(2);
  });
});
