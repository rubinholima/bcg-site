import {
  buildDisciplineGrid,
  findPlayerStatForMatch,
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
});
