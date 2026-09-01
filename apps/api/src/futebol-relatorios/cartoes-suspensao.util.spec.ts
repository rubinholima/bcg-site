import {
  buildDisciplineGrid,
  buildStaffDisciplineGrid,
  collectDisciplineParticipantIds,
  enrichDisciplineStatsFromUnresolved,
  findPlayerStatForMatch,
  inferPrimaryCompetitionFromReports,
  mergeDisciplinePlayerList,
  normalizeCompetitionKey,
  reportMatchesCompetitionFilter,
} from './cartoes-suspensao.util';

describe('findPlayerStatForMatch', () => {
  const stats = [
    {
      playerId: 'wrong-player',
      jerseyNumber: 10,
      playerName: 'Outro Atleta',
      played: true,
      yellowCards: 1,
      redCards: 0,
    },
  ];

  it('não atribui cartão por camisa quando playerId não bate', () => {
    const stat = findPlayerStatForMatch(stats, {
      id: 'joao-pedro',
      name: 'João Pedro Pimentel',
      jerseyNumber: 10,
      position: null,
      status: 'available',
      statusDetails: null,
      yellowCards: null,
      redCards: null,
      registrationProfile: null,
    });
    expect(stat).toBeUndefined();
  });

  it('usa apenas playerId quando vinculado corretamente', () => {
    const stat = findPlayerStatForMatch(stats, {
      id: 'wrong-player',
      name: 'João Pedro Pimentel',
      jerseyNumber: 7,
      position: null,
      status: 'available',
      statusDetails: null,
      yellowCards: null,
      redCards: null,
      registrationProfile: null,
    });
    expect(stat?.yellowCards).toBe(1);
  });
});

describe('buildDisciplineGrid', () => {
  it('não conta amarelo fantasma por camisa repetida', () => {
    const matchDate = new Date('2026-08-10T12:00:00Z');
    const grid = buildDisciplineGrid({
      clubName: 'Boston City',
      aliases: [],
      disciplineCategory: 'sub20',
      matches: [
        {
          id: 'm1',
          round: 1,
          matchDate,
          homeTeam: 'Boston City',
          awayTeam: 'América-MG',
          homeScore: 1,
          awayScore: 0,
          occurrencesText: null,
          playerStats: [
            {
              playerId: 'samuel',
              jerseyNumber: 10,
              playerName: 'Outro Atleta',
              played: true,
              yellowCards: 1,
              redCards: 0,
            },
          ],
        },
      ],
      players: [
        {
          id: 'joao',
          name: 'João Pedro Pimentel',
          jerseyNumber: 10,
          position: 'ATA',
          status: 'available',
          statusDetails: null,
          yellowCards: null,
          redCards: null,
          registrationProfile: null,
        },
        {
          id: 'samuel',
          name: 'Samuel Fernandes',
          jerseyNumber: 7,
          position: 'MEI',
          status: 'available',
          statusDetails: null,
          yellowCards: null,
          redCards: null,
          registrationProfile: null,
        },
      ],
    });

    const joao = grid.players.find((p) => p.playerId === 'joao');
    const samuel = grid.players.find((p) => p.playerId === 'samuel');
    expect(joao?.yellowCardsTotal).toBe(0);
    expect(joao?.roundCells[0]).toBe('');
    expect(samuel?.yellowCardsTotal).toBe(1);
    expect(samuel?.roundCells[0]).toBe('AV');
  });

  it('marca subida quando cadastro é de categoria inferior', () => {
    const matchDate = new Date('2026-08-10T12:00:00Z');
    const grid = buildDisciplineGrid({
      clubName: 'Boston City',
      aliases: [],
      disciplineCategory: 'sub20',
      matches: [
        {
          id: 'm1',
          round: 1,
          matchDate,
          homeTeam: 'Boston City',
          awayTeam: 'Atlético-MG',
          homeScore: 0,
          awayScore: 1,
          occurrencesText: null,
          playerStats: [
            {
              playerId: 'joao-victor',
              jerseyNumber: 22,
              playerName: 'João Victor Machado',
              played: true,
              yellowCards: 1,
              redCards: 0,
            },
          ],
        },
      ],
      players: [
        {
          id: 'joao-victor',
          name: 'João Victor Machado',
          jerseyNumber: 22,
          position: 'ZAG',
          category: 'sub17',
          status: 'available',
          statusDetails: null,
          yellowCards: null,
          redCards: null,
          registrationProfile: null,
        },
      ],
    });

    const row = grid.players.find((p) => p.playerId === 'joao-victor');
    expect(row?.yellowCardsTotal).toBe(1);
    expect(row?.playedUp).toBe(true);
    expect(row?.squadCategory).toBe('sub17');
  });

  it('saldo de entrada com 2 amarelos deixa atleta pendurado', () => {
    const player = {
      id: 'transfer',
      name: 'Atleta Transferido',
      jerseyNumber: 9,
      position: 'ATA',
      status: 'available',
      statusDetails: null,
      yellowCards: null,
      redCards: null,
      registrationProfile: null,
    };
    const baseMatch = {
      homeTeam: 'Boston City',
      awayTeam: 'NAC',
      homeScore: 1,
      awayScore: 0,
      occurrencesText: null,
    };
    const grid = buildDisciplineGrid({
      clubName: 'Boston City',
      aliases: [],
      disciplineCategory: 'sub13',
      nextMatchDate: '2026-08-17',
      players: [player],
      openingByPlayerId: new Map([
        [
          'transfer',
          { effectiveFrom: '2026-08-01', yellowAccum: 2, suspensionRoundsLeft: 0 },
        ],
      ]),
      matches: [
        {
          id: 'm1',
          round: 1,
          matchDate: new Date('2026-08-10T12:00:00Z'),
          ...baseMatch,
          playerStats: [
            {
              playerId: 'transfer',
              jerseyNumber: 9,
              playerName: 'Atleta Transferido',
              played: true,
              yellowCards: 0,
              redCards: 0,
            },
          ],
        },
      ],
    });
    expect(grid.players[0]?.nextRoundCell).toBe('P');
  });

  it('saldo de entrada 2 amarelos + novo amarelo gera suspensão e zera acúmulo', () => {
    const player = {
      id: 'transfer',
      name: 'Atleta Transferido',
      jerseyNumber: 9,
      position: 'ATA',
      status: 'available',
      statusDetails: null,
      yellowCards: null,
      redCards: null,
      registrationProfile: null,
    };
    const baseMatch = {
      homeTeam: 'Boston City',
      awayTeam: 'NAC',
      homeScore: 1,
      awayScore: 0,
      occurrencesText: null,
    };
    const grid = buildDisciplineGrid({
      clubName: 'Boston City',
      aliases: [],
      disciplineCategory: 'sub13',
      nextMatchDate: '2026-08-24',
      players: [player],
      openingByPlayerId: new Map([
        [
          'transfer',
          { effectiveFrom: '2026-08-01', yellowAccum: 2, suspensionRoundsLeft: 0 },
        ],
      ]),
      matches: [
        {
          id: 'm1',
          round: 1,
          matchDate: new Date('2026-08-10T12:00:00Z'),
          ...baseMatch,
          playerStats: [
            {
              playerId: 'transfer',
              jerseyNumber: 9,
              playerName: 'Atleta Transferido',
              played: true,
              yellowCards: 0,
              redCards: 0,
            },
          ],
        },
        {
          id: 'm2',
          round: 2,
          matchDate: new Date('2026-08-17T12:00:00Z'),
          ...baseMatch,
          playerStats: [
            {
              playerId: 'transfer',
              jerseyNumber: 9,
              playerName: 'Atleta Transferido',
              played: true,
              yellowCards: 1,
              redCards: 0,
            },
          ],
        },
      ],
    });
    expect(grid.players[0]?.nextRoundCell).toBe('S');
    expect(grid.players[0]?.yellowCardsTotal).toBe(1);
  });
});

describe('mergeDisciplinePlayerList', () => {
  it('inclui atleta de outra categoria que jogou na planilha', () => {
    const roster = [{ id: 'p20', name: 'Atleta Sub20', jerseyNumber: 9 }];
    const guest = [{ id: 'p17', name: 'João Victor', jerseyNumber: 22, category: 'sub17' }];
    const merged = mergeDisciplinePlayerList(roster, ['p20', 'p17'], guest);
    expect(merged.map((p) => p.id)).toEqual(['p20', 'p17']);
  });

  it('collectDisciplineParticipantIds ignora playerId vazio', () => {
    const ids = collectDisciplineParticipantIds([
      { playerStats: [{ playerId: 'a' }, { playerId: '' }, { playerId: 'b' }] },
    ]);
    expect(ids.sort()).toEqual(['a', 'b']);
  });
});

describe('enrichDisciplineStatsFromUnresolved', () => {
  it('inclui cartões de atleta pendente na importação', () => {
    const enriched = enrichDisciplineStatsFromUnresolved(
      [],
      [
        {
          cbfRegistration: '123',
          sourceName: 'João Victor Machado',
          jerseyNumber: 22,
          played: true,
          yellowCards: 1,
          redCards: 0,
        },
      ],
      () => 'joao-victor',
    );
    expect(enriched).toHaveLength(1);
    expect(enriched[0]?.playerId).toBe('joao-victor');
    expect(enriched[0]?.yellowCards).toBe(1);
  });

  it('completa cartões quando vínculo parcial já existe na partida', () => {
    const enriched = enrichDisciplineStatsFromUnresolved(
      [
        {
          playerId: 'joao-victor',
          jerseyNumber: 4,
          playerName: 'Joao Victor',
          played: true,
          yellowCards: 0,
          redCards: 0,
        },
      ],
      [
        {
          cbfRegistration: '776375',
          sourceName: 'Joao Victor Machado De Oliveira',
          jerseyNumber: 4,
          played: true,
          yellowCards: 1,
          redCards: 0,
        },
      ],
      () => 'joao-victor',
    );
    expect(enriched).toHaveLength(1);
    expect(enriched[0]?.yellowCards).toBe(1);
  });
});

describe('reportMatchesCompetitionFilter', () => {
  it('separa mineiro e brasileiro sub-20', () => {
    expect(
      reportMatchesCompetitionFilter(
        { competition: 'Campeonato Mineiro Sub-20' },
        'Campeonato Mineiro Sub-20',
      ),
    ).toBe(true);
    expect(
      reportMatchesCompetitionFilter(
        { competition: 'Campeonato Brasileiro Sub-20' },
        'Campeonato Mineiro Sub-20',
      ),
    ).toBe(false);
  });
});

describe('pendurado por competição', () => {
  it('marca P na próxima rodada após 2 amarelos', () => {
    const matchDate = new Date('2026-08-10T12:00:00Z');
    const matchDate2 = new Date('2026-08-17T12:00:00Z');
    const grid = buildDisciplineGrid({
      clubName: 'Boston City',
      aliases: [],
      disciplineCategory: 'sub20',
      nextMatchDate: '2026-08-24',
      matches: [
        {
          id: 'm1',
          round: 1,
          matchDate,
          homeTeam: 'Boston City',
          awayTeam: 'NAC',
          homeScore: 1,
          awayScore: 0,
          occurrencesText: null,
          playerStats: [
            {
              playerId: 'kayo',
              jerseyNumber: 11,
              playerName: 'Kayo Fonseca',
              played: true,
              yellowCards: 1,
              redCards: 0,
            },
          ],
        },
        {
          id: 'm2',
          round: 2,
          matchDate: matchDate2,
          homeTeam: 'Boston City',
          awayTeam: 'Cruzeiro',
          homeScore: 0,
          awayScore: 0,
          occurrencesText: null,
          playerStats: [
            {
              playerId: 'kayo',
              jerseyNumber: 11,
              playerName: 'Kayo Fonseca',
              played: true,
              yellowCards: 1,
              redCards: 0,
            },
          ],
        },
      ],
      players: [
        {
          id: 'kayo',
          name: 'Kayo Fonseca',
          jerseyNumber: 11,
          position: 'MEI',
          category: 'sub20',
          status: 'available',
          statusDetails: null,
          yellowCards: null,
          redCards: null,
          registrationProfile: null,
        },
      ],
    });

    const kayo = grid.players.find((p) => p.playerId === 'kayo');
    expect(kayo?.yellowCardsTotal).toBe(2);
    expect(kayo?.nextRoundCell).toBe('P');
  });

  it('vermelho não zera amarelos — retorna pendurado e 3º amarelo suspende', () => {
    const d = (iso: string) => new Date(iso);
    const lucas = {
      id: 'lucas-canela',
      name: 'Lucas Canela',
      jerseyNumber: 8,
      position: 'ZAG',
      category: 'sub20',
      status: 'available',
      statusDetails: null,
      yellowCards: null,
      redCards: null,
      registrationProfile: null,
    };
    const grid = buildDisciplineGrid({
      clubName: 'Boston City',
      aliases: [],
      disciplineCategory: 'sub20',
      nextMatchDate: '2026-09-01',
      matches: [
        {
          id: 'm1',
          round: 1,
          matchDate: d('2026-08-03T12:00:00Z'),
          homeTeam: 'Boston City',
          awayTeam: 'NAC',
          homeScore: 1,
          awayScore: 0,
          occurrencesText: null,
          playerStats: [{ playerId: 'lucas-canela', jerseyNumber: 8, playerName: 'Lucas Canela', played: true, yellowCards: 1, redCards: 0 }],
        },
        {
          id: 'm2',
          round: 2,
          matchDate: d('2026-08-10T12:00:00Z'),
          homeTeam: 'Boston City',
          awayTeam: 'Cruzeiro',
          homeScore: 0,
          awayScore: 0,
          occurrencesText: null,
          playerStats: [{ playerId: 'lucas-canela', jerseyNumber: 8, playerName: 'Lucas Canela', played: true, yellowCards: 1, redCards: 0 }],
        },
        {
          id: 'm3',
          round: 3,
          matchDate: d('2026-08-17T12:00:00Z'),
          homeTeam: 'Boston City',
          awayTeam: 'Atlético-MG',
          homeScore: 0,
          awayScore: 1,
          occurrencesText: null,
          playerStats: [{ playerId: 'lucas-canela', jerseyNumber: 8, playerName: 'Lucas Canela', played: true, yellowCards: 0, redCards: 1 }],
        },
        {
          id: 'm4',
          round: 4,
          matchDate: d('2026-08-24T12:00:00Z'),
          homeTeam: 'Boston City',
          awayTeam: 'América-MG',
          homeScore: 1,
          awayScore: 1,
          occurrencesText: null,
          playerStats: [],
        },
        {
          id: 'm5',
          round: 5,
          matchDate: d('2026-08-31T12:00:00Z'),
          homeTeam: 'Itabirito',
          awayTeam: 'Boston City',
          homeScore: 0,
          awayScore: 2,
          occurrencesText: null,
          playerStats: [{ playerId: 'lucas-canela', jerseyNumber: 8, playerName: 'Lucas Canela', played: true, yellowCards: 1, redCards: 0 }],
        },
      ],
      players: [lucas],
    });

    const row = grid.players.find((p) => p.playerId === 'lucas-canela');
    expect(row?.roundCells).toEqual(['AV', 'AV', 'V', 'SA', 'AV']);
    expect(row?.yellowCardsTotal).toBe(3);
    expect(row?.redCardsTotal).toBe(1);
    expect(row?.nextRoundCell).toBe('S');
  });

  it('não usa yellowCards do cadastro como saldo inicial na simulação', () => {
    const d = (iso: string) => new Date(iso);
    const grid = buildDisciplineGrid({
      clubName: 'Boston City',
      aliases: [],
      disciplineCategory: 'sub20',
      matches: [
        {
          id: 'm1',
          round: 1,
          matchDate: d('2026-08-03T12:00:00Z'),
          homeTeam: 'Boston City',
          awayTeam: 'NAC',
          homeScore: 1,
          awayScore: 0,
          occurrencesText: null,
          playerStats: [
            { playerId: 'mateus', jerseyNumber: 10, playerName: 'Mateus', played: true, yellowCards: 1, redCards: 0 },
          ],
        },
        {
          id: 'm2',
          round: 2,
          matchDate: d('2026-08-10T12:00:00Z'),
          homeTeam: 'Boston City',
          awayTeam: 'CRU',
          homeScore: 0,
          awayScore: 0,
          occurrencesText: null,
          playerStats: [
            { playerId: 'mateus', jerseyNumber: 10, playerName: 'Mateus', played: true, yellowCards: 1, redCards: 0 },
          ],
        },
      ],
      players: [
        {
          id: 'mateus',
          name: 'Mateus Pereira',
          jerseyNumber: 10,
          position: 'MEI',
          category: 'sub20',
          status: 'available',
          statusDetails: null,
          yellowCards: 6,
          redCards: 0,
          registrationProfile: null,
        },
      ],
    });
    const row = grid.players[0];
    expect(row?.yellowCardsTotal).toBe(2);
    expect(row?.nextRoundCell).toBe('P');
    expect(row?.roundCells).toEqual(['AV', 'AV']);
  });

  it('não marca pendurado por amarelo sem ter jogado', () => {
    const matchDate = new Date('2026-08-10T12:00:00Z');
    const grid = buildDisciplineGrid({
      clubName: 'Boston City',
      aliases: [],
      disciplineCategory: 'sub17',
      matches: [
        {
          id: 'm1',
          round: 1,
          matchDate,
          homeTeam: 'Boston City',
          awayTeam: 'NAC',
          homeScore: 1,
          awayScore: 0,
          occurrencesText: null,
          playerStats: [
            {
              playerId: 'davi-sales',
              jerseyNumber: 7,
              playerName: 'Davi Sales',
              played: false,
              yellowCards: 1,
              redCards: 0,
            },
          ],
        },
      ],
      players: [
        {
          id: 'davi-sales',
          name: 'Davi Sales',
          jerseyNumber: 7,
          position: 'MEI',
          category: 'sub17',
          status: 'available',
          statusDetails: null,
          yellowCards: null,
          redCards: null,
          registrationProfile: null,
        },
      ],
    });

    const davi = grid.players.find((p) => p.playerId === 'davi-sales');
    expect(davi?.yellowCardsTotal).toBe(0);
    expect(davi?.nextRoundCell).toBe('');
    expect(davi?.roundCells[0]).toBe('');
  });

  it('ordena suspenso, pendurado e com cartão', () => {
    const d = (iso: string) => new Date(iso);
    const basePlayer = {
      position: 'MEI',
      category: 'sub20',
      status: 'available',
      statusDetails: null,
      yellowCards: null,
      redCards: null,
      registrationProfile: null,
    };
    const grid = buildDisciplineGrid({
      clubName: 'Boston City',
      aliases: [],
      disciplineCategory: 'sub20',
      nextMatchDate: '2026-08-24',
      matches: [
        {
          id: 'm1',
          round: 1,
          matchDate: d('2026-08-10T12:00:00Z'),
          homeTeam: 'Boston City',
          awayTeam: 'NAC',
          homeScore: 1,
          awayScore: 0,
          occurrencesText: null,
          playerStats: [
            { playerId: 'pendurado', jerseyNumber: 2, playerName: 'Pendurado', played: true, yellowCards: 1, redCards: 0 },
            { playerId: 'com-cartao', jerseyNumber: 3, playerName: 'Com Cartão', played: true, yellowCards: 1, redCards: 0 },
          ],
        },
        {
          id: 'm2',
          round: 2,
          matchDate: d('2026-08-17T12:00:00Z'),
          homeTeam: 'Boston City',
          awayTeam: 'Cruzeiro',
          homeScore: 0,
          awayScore: 0,
          occurrencesText: null,
          playerStats: [
            { playerId: 'pendurado', jerseyNumber: 2, playerName: 'Pendurado', played: true, yellowCards: 1, redCards: 0 },
            { playerId: 'suspenso', jerseyNumber: 1, playerName: 'Suspenso', played: true, yellowCards: 0, redCards: 1 },
          ],
        },
      ],
      players: [
        { id: 'limpo', name: 'Limpo', jerseyNumber: 4, ...basePlayer },
        { id: 'com-cartao', name: 'Com Cartão', jerseyNumber: 3, ...basePlayer },
        { id: 'pendurado', name: 'Pendurado', jerseyNumber: 2, ...basePlayer },
        { id: 'suspenso', name: 'Suspenso', jerseyNumber: 1, ...basePlayer },
      ],
    });

    expect(grid.players.map((p) => p.playerId)).toEqual([
      'suspenso',
      'pendurado',
      'com-cartao',
      'limpo',
    ]);
  });
});

describe('normalizeCompetitionKey / primary competition', () => {
  it('une variações de hífen no rótulo FMF Sub-14', () => {
    expect(normalizeCompetitionKey('SUB 14 - 1ª DIVISÃO 2026')).toBe(
      normalizeCompetitionKey('SUB 14 - 1ª DIVISÃO - 2026'),
    );
  });

  it('bate Sub-20 com e sem acento/hífen', () => {
    expect(
      reportMatchesCompetitionFilter(
        { competition: 'SUB 20 - 1ª DIVISÃO - 2026' },
        'SUB 20 - 1a DIVISAO - 2026',
      ),
    ).toBe(true);
  });

  it('ignora amistoso ao escolher competição primária', () => {
    const primary = inferPrimaryCompetitionFromReports([
      { competition: 'Amistoso' },
      { competition: 'Amistoso' },
      { competition: 'Amistoso' },
      { competition: 'SUB 15 - 1ª DIVISÃO - 2026' },
      { competition: 'SUB 15 - 1ª DIVISÃO - 2026' },
    ]);
    expect(primary).toBe('SUB 15 - 1ª DIVISÃO - 2026');
  });
});

describe('buildStaffDisciplineGrid', () => {
  it('marca comissão pendurada após 2 amarelos e suspende no 3º', () => {
    const staff = [{ id: 'tec1', name: 'João Técnico', roleLabel: 'Técnico' }];
    const baseMatch = {
      homeTeam: 'Boston City',
      awayTeam: 'NAC',
      homeScore: 1,
      awayScore: 0,
      playerStats: [],
    };

    const afterTwo = buildStaffDisciplineGrid({
      clubName: 'Boston City',
      aliases: [],
      nextMatchDate: '2026-08-24',
      staff,
      matches: [
        {
          id: 'm1',
          round: 1,
          matchDate: new Date('2026-08-10T12:00:00Z'),
          ...baseMatch,
          occurrencesText: 'Cartão amarelo para o técnico João Técnico',
        },
        {
          id: 'm2',
          round: 2,
          matchDate: new Date('2026-08-17T12:00:00Z'),
          ...baseMatch,
          occurrencesText: 'Advertência ao técnico João Técnico',
        },
      ],
    });

    expect(afterTwo.staff[0]?.yellowCardsTotal).toBe(2);
    expect(afterTwo.staff[0]?.nextRoundCell).toBe('P');

    const afterThree = buildStaffDisciplineGrid({
      clubName: 'Boston City',
      aliases: [],
      nextMatchDate: '2026-08-31',
      staff,
      matches: [
        {
          id: 'm1',
          round: 1,
          matchDate: new Date('2026-08-10T12:00:00Z'),
          ...baseMatch,
          occurrencesText: 'Cartão amarelo para o técnico João Técnico',
        },
        {
          id: 'm2',
          round: 2,
          matchDate: new Date('2026-08-17T12:00:00Z'),
          ...baseMatch,
          occurrencesText: 'Advertência ao técnico João Técnico',
        },
        {
          id: 'm3',
          round: 3,
          matchDate: new Date('2026-08-24T12:00:00Z'),
          ...baseMatch,
          occurrencesText: 'Cartão amarelo para o técnico João Técnico',
        },
      ],
    });

    expect(afterThree.staff[0]?.nextRoundCell).toBe('S');
  });

  it('lê cartões do técnico na seção Cartões Amarelos da súmula FMF', () => {
    const staff = [{ id: 'tec1', name: 'Adriano Dos Santos Almeida', roleLabel: 'Técnico' }];
    const result = buildStaffDisciplineGrid({
      clubName: 'Boston City',
      aliases: [],
      nextMatchDate: '2026-08-24',
      staff,
      matches: [
        {
          id: 'm1',
          round: 1,
          matchDate: new Date('2026-08-10T12:00:00Z'),
          homeTeam: 'Boston City',
          awayTeam: 'NAC',
          homeScore: 1,
          awayScore: 0,
          occurrencesText: null,
          staffCardEvents: [
            {
              kind: 'yellow',
              roleLabel: 'Técnico',
              name: 'Adriano Dos Santos Almeida',
              excerpt: '20:00 2T Técnico Adriano Dos Santos Almeida',
            },
          ],
          playerStats: [],
        },
        {
          id: 'm2',
          round: 2,
          matchDate: new Date('2026-08-17T12:00:00Z'),
          homeTeam: 'Boston City',
          awayTeam: 'Villa',
          homeScore: 2,
          awayScore: 0,
          occurrencesText: null,
          staffCardEvents: [
            {
              kind: 'yellow',
              roleLabel: 'Técnico',
              name: 'Adriano Dos Santos Almeida',
              excerpt: '35:00 2T Técnico Adriano Dos Santos Almeida',
            },
          ],
          playerStats: [],
        },
      ],
    });

    expect(result.staff[0]?.yellowCardsTotal).toBe(2);
    expect(result.staff[0]?.nextRoundCell).toBe('P');
  });

  it('CASE C: mesmo staff U17 com funções diferentes acumula 3 amarelos juntos', () => {
    const staffResolution = [
      { id: 'jose', name: 'José Silva', roleLabel: 'Técnico', licenseNumber: '123456' },
    ];
    const baseMatch = {
      homeTeam: 'Boston City',
      awayTeam: 'NAC',
      homeScore: 1,
      awayScore: 0,
      playerStats: [],
      occurrencesText: null as string | null,
    };
    const result = buildStaffDisciplineGrid({
      clubName: 'Boston City',
      aliases: [],
      staff: [],
      staffCandidates: staffResolution,
      matches: [
        {
          id: 'm1',
          round: 1,
          matchDate: new Date('2026-08-10T12:00:00Z'),
          ...baseMatch,
          staffCardEvents: [
            { kind: 'yellow', roleLabel: 'Técnico', name: 'José Silva', excerpt: '10:00 1T Técnico José Silva' },
          ],
        },
        {
          id: 'm2',
          round: 2,
          matchDate: new Date('2026-08-17T12:00:00Z'),
          ...baseMatch,
          staffCardEvents: [
            {
              kind: 'yellow',
              roleLabel: 'Auxiliar técnico',
              name: 'José Silva',
              excerpt: '20:00 1T Auxiliar técnico José Silva',
            },
          ],
        },
        {
          id: 'm3',
          round: 3,
          matchDate: new Date('2026-08-24T12:00:00Z'),
          ...baseMatch,
          staffCardEvents: [
            { kind: 'yellow', roleLabel: 'Massagista', name: 'José Silva', excerpt: '30:00 2T Massagista José Silva' },
          ],
        },
      ],
    });
    expect(result.staff).toHaveLength(1);
    expect(result.staff[0]?.yellowCardsTotal).toBe(3);
    expect(result.staff[0]?.nextRoundCell).toBe('S');
  });

  it('CASE D: acumulações U17 e U20 permanecem independentes', () => {
    const staffResolution = [
      { id: 'jose', name: 'José Silva', roleLabel: 'Técnico', licenseNumber: '123456' },
    ];
    const u17Grid = buildStaffDisciplineGrid({
      clubName: 'Boston City',
      aliases: [],
      staff: [],
      staffCandidates: staffResolution,
      matches: Array.from({ length: 3 }, (_, index) => ({
        id: `u17-${index + 1}`,
        round: index + 1,
        matchDate: new Date(`2026-08-${10 + index * 7}T12:00:00Z`),
        homeTeam: 'Boston City',
        awayTeam: 'NAC',
        homeScore: 1,
        awayScore: 0,
        occurrencesText: null,
        playerStats: [],
        staffCardEvents: [
          { kind: 'yellow', roleLabel: 'Técnico', name: 'José Silva', excerpt: `10:00 1T Técnico José Silva ${index}` },
        ],
      })),
    });

    const u20Grid = buildStaffDisciplineGrid({
      clubName: 'Boston City',
      aliases: [],
      staff: staffResolution,
      staffCandidates: staffResolution,
      matches: [
        {
          id: 'u20-1',
          round: 1,
          matchDate: new Date('2026-08-10T12:00:00Z'),
          homeTeam: 'Boston City',
          awayTeam: 'CRU',
          homeScore: 2,
          awayScore: 1,
          occurrencesText: null,
          playerStats: [],
          staffCardEvents: [
            { kind: 'yellow', roleLabel: 'Técnico', name: 'José Silva', excerpt: '10:00 1T Técnico José Silva' },
          ],
        },
      ],
    });

    expect(u17Grid.staff[0]?.yellowCardsTotal).toBe(3);
    expect(u17Grid.staff[0]?.nextRoundCell).toBe('S');
    expect(u20Grid.staff[0]?.yellowCardsTotal).toBe(1);
    expect(u20Grid.staff[0]?.nextRoundCell).toBe('');
  });

  it('CASE E: vermelho U17 não suspende automaticamente em grid U20', () => {
    const staffResolution = [
      { id: 'jose', name: 'José Silva', roleLabel: 'Técnico', licenseNumber: '123456' },
    ];
    const u17Grid = buildStaffDisciplineGrid({
      clubName: 'Boston City',
      aliases: [],
      nextMatchDate: '2026-08-24',
      staff: [],
      staffCandidates: staffResolution,
      matches: [
        {
          id: 'u17-red',
          round: 1,
          matchDate: new Date('2026-08-10T12:00:00Z'),
          homeTeam: 'Boston City',
          awayTeam: 'NAC',
          homeScore: 1,
          awayScore: 0,
          occurrencesText: null,
          playerStats: [],
          staffCardEvents: [
            { kind: 'red', roleLabel: 'Técnico', name: 'José Silva', excerpt: '80:00 2T Técnico José Silva' },
          ],
        },
      ],
    });

    const u20Grid = buildStaffDisciplineGrid({
      clubName: 'Boston City',
      aliases: [],
      nextMatchDate: '2026-08-24',
      staff: staffResolution,
      staffCandidates: staffResolution,
      matches: [
        {
          id: 'u20-clean',
          round: 1,
          matchDate: new Date('2026-08-10T16:00:00Z'),
          homeTeam: 'Boston City',
          awayTeam: 'CRU',
          homeScore: 2,
          awayScore: 1,
          occurrencesText: null,
          playerStats: [],
          staffCardEvents: [],
        },
      ],
    });

    expect(u17Grid.staff[0]?.nextRoundCell).toBe('S');
    expect(u20Grid.staff[0]?.nextRoundCell).toBe('');
  });
});
