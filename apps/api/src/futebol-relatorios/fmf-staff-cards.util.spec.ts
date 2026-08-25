import {
  aggregateStaffDisciplineRows,
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
