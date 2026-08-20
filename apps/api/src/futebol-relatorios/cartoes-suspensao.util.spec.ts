import {
  buildDisciplineGrid,
  collectDisciplineParticipantIds,
  findPlayerStatForMatch,
  mergeDisciplinePlayerList,
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
