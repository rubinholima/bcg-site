import {
  aggregateStaffDisciplineRows,
  filterStaffCardEventsForOurClub,
  parseStaffCardsForMatch,
  parseStaffCardsFromOccurrences,
} from './fmf-staff-cards.util';

const staff = [
  { id: 'tec-1', name: 'João Silva', role: 'tecnico' },
  { id: 'aux-1', name: 'Carlos Souza', role: 'auxiliar_tecnico' },
];

describe('parseStaffCardsFromOccurrences', () => {
  it('extrai cartão amarelo da comissão técnica', () => {
    const cards = parseStaffCardsFromOccurrences(
      'Cartão amarelo para o técnico João Silva por conduta antidesportiva.',
      staff,
    );
    expect(cards).toHaveLength(1);
    expect(cards[0]?.staffId).toBe('tec-1');
    expect(cards[0]?.yellowCards).toBe(1);
    expect(cards[0]?.redCards).toBe(0);
  });

  it('extrai cartão vermelho do auxiliar técnico', () => {
    const cards = parseStaffCardsFromOccurrences(
      'Expulsão do auxiliar técnico Carlos Souza.',
      staff,
    );
    expect(cards).toHaveLength(1);
    expect(cards[0]?.staffId).toBe('aux-1');
    expect(cards[0]?.redCards).toBe(1);
  });

  it('ignora linha sem membro cadastrado no tenant', () => {
    const cards = parseStaffCardsFromOccurrences(
      'Cartão amarelo para o médico Fulano de Tal adversário.',
      staff,
    );
    expect(cards).toHaveLength(0);
  });
});

describe('filterStaffCardEventsForOurClub', () => {
  it('remove cartão da comissão adversária', () => {
    const filtered = filterStaffCardEventsForOurClub(
      [
        {
          kind: 'yellow',
          roleLabel: 'Técnico',
          name: 'Adriano Dos Santos Almeida',
          excerpt: '20:00 2T Técnico Adriano; NACIONAL',
          teamSide: 'away',
        },
        {
          kind: 'yellow',
          roleLabel: 'Técnico',
          name: 'João Silva',
          excerpt: '10:00 1T Técnico João Silva; BOSTON',
          teamSide: 'home',
        },
      ],
      {
        homeTeam: 'BOSTON CITY FUTEBOL CLUBE SAF',
        awayTeam: 'NACIONAL',
        clubName: 'Boston City',
        aliases: ['BOSTON'],
      },
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.name).toBe('João Silva');
  });
});

describe('parseStaffCardsForMatch', () => {
  it('lê cartão do técnico do nosso clube na seção Cartões Amarelos', () => {
    const cards = parseStaffCardsForMatch(
      {
        staffCardEvents: [
          {
            kind: 'yellow',
            roleLabel: 'Técnico',
            name: 'João Silva',
            excerpt: '10:00 1T Técnico João Silva; BOSTON',
            teamSide: 'home',
          },
        ],
        clubFilter: {
          homeTeam: 'BOSTON CITY FUTEBOL CLUBE SAF',
          awayTeam: 'NACIONAL',
          clubName: 'Boston City',
          aliases: ['BOSTON'],
        },
      },
      [{ id: 'tec-1', name: 'João Silva', role: 'tecnico' }],
    );
    expect(cards).toHaveLength(1);
    expect(cards[0]?.staffId).toBe('tec-1');
    expect(cards[0]?.yellowCards).toBe(1);
  });

  it('ignora cartão do técnico adversário mesmo com nome parecido', () => {
    const cards = parseStaffCardsForMatch(
      {
        staffCardEvents: [
          {
            kind: 'yellow',
            roleLabel: 'Técnico',
            name: 'Adriano Dos Santos Almeida',
            excerpt: '20:00 2T Técnico Adriano Dos Santos Almeida; NACIONAL',
            teamSide: 'away',
          },
        ],
        clubFilter: {
          homeTeam: 'BOSTON CITY FUTEBOL CLUBE SAF',
          awayTeam: 'NACIONAL',
          clubName: 'Boston City',
          aliases: ['BOSTON'],
        },
      },
      [{ id: 'tec-1', name: 'Adriano Dos Santos Almeida', role: 'tecnico' }],
    );
    expect(cards).toHaveLength(0);
  });

  it('combina cartões da seção de cartões e de ocorrências', () => {
    const cards = parseStaffCardsForMatch(
      {
        occurrencesText: 'Cartão amarelo para o auxiliar técnico Carlos Souza.',
        staffCardEvents: [
          {
            kind: 'yellow',
            roleLabel: 'Técnico',
            name: 'João Silva',
            excerpt: '10:00 1T Técnico João Silva',
            teamSide: 'home',
          },
        ],
        clubFilter: {
          homeTeam: 'BOSTON',
          awayTeam: 'NACIONAL',
          clubName: 'Boston City',
          aliases: ['BOSTON'],
        },
      },
      staff,
    );
    expect(cards).toHaveLength(2);
    expect(cards.some((c) => c.staffId === 'tec-1')).toBe(true);
    expect(cards.some((c) => c.staffId === 'aux-1')).toBe(true);
  });
});

describe('aggregateStaffDisciplineRows', () => {
  it('agrega cartões por membro da comissão', () => {
    const rows = aggregateStaffDisciplineRows([
      {
        staffId: 'tec-1',
        name: 'João Silva',
        roleLabel: 'Técnico',
        yellowCards: 1,
        redCards: 0,
        excerpt: 'a',
        matchDate: '2026-08-10',
        matchLabel: 'Jogo 1',
      },
      {
        staffId: 'tec-1',
        name: 'João Silva',
        roleLabel: 'Técnico',
        yellowCards: 0,
        redCards: 1,
        excerpt: 'b',
        matchDate: '2026-08-17',
        matchLabel: 'Jogo 2',
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.yellowCards).toBe(1);
    expect(rows[0]?.redCards).toBe(1);
    expect(rows[0]?.matches).toHaveLength(2);
  });
});
