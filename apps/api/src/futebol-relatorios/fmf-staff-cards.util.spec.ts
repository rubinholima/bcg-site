import {
  aggregateStaffDisciplineRows,
  dedupeStaffCardOccurrences,
  filterStaffCardEventsForOurClub,
  parseStaffCardsForMatch,
  parseStaffCardsFromOccurrences,
  resolveStaffByRegistration,
  resolveStaffDisciplineMember,
} from './fmf-staff-cards.util';

const joseU20 = {
  id: 'staff-jose',
  name: 'José Silva',
  role: 'TÉCNICO',
  licenseNumber: '123456',
  categories: ['sub20'] as string[],
};

const joseDuplicateReg = {
  id: 'staff-jose-dup',
  name: 'José Silva Duplicado',
  role: 'AUXILIAR TÉCNICO',
  licenseNumber: '123456',
};

const carlos = {
  id: 'aux-1',
  name: 'Carlos Souza',
  role: 'auxiliar_tecnico',
  licenseNumber: null as string | null,
};

const staffPool = [joseU20, carlos];

describe('parseStaffCardsFromOccurrences', () => {
  it('CASE A: staff default U17 + match U17 aparece normalmente', () => {
    const u17Staff = [{ id: 'tec-u17', name: 'João Silva', role: 'tecnico', licenseNumber: null }];
    const cards = parseStaffCardsForMatch(
      {
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
          awayTeam: 'NAC',
          clubName: 'Boston City',
          aliases: ['BOSTON'],
        },
      },
      u17Staff,
    );
    expect(cards).toHaveLength(1);
    expect(cards[0]?.staffId).toBe('tec-u17');
    expect(cards[0]?.yellowCards).toBe(1);
  });

  it('CASE B: staff default U20 + match U17 — cartão aparece em U17', () => {
    const cards = parseStaffCardsForMatch(
      {
        staffCardEvents: [
          {
            kind: 'yellow',
            roleLabel: 'Auxiliar técnico',
            name: 'José Silva',
            excerpt: '12:00 1T Auxiliar técnico José Silva',
            teamSide: 'home',
          },
        ],
        clubFilter: {
          homeTeam: 'BOSTON',
          awayTeam: 'NAC',
          clubName: 'Boston City',
          aliases: ['BOSTON'],
        },
      },
      staffPool,
    );
    expect(cards).toHaveLength(1);
    expect(cards[0]?.staffId).toBe('staff-jose');
    expect(cards[0]?.roleLabel).toBe('Auxiliar técnico');
  });

  it('extrai cartão amarelo da comissão técnica', () => {
    const cards = parseStaffCardsFromOccurrences(
      'Cartão amarelo para o técnico João Silva por conduta antidesportiva.',
      [{ id: 'tec-1', name: 'João Silva', role: 'tecnico', licenseNumber: null }],
    );
    expect(cards).toHaveLength(1);
    expect(cards[0]?.staffId).toBe('tec-1');
    expect(cards[0]?.yellowCards).toBe(1);
  });

  it('ignora linha sem membro cadastrado no tenant', () => {
    const cards = parseStaffCardsFromOccurrences(
      'Cartão amarelo para o médico Fulano de Tal adversário.',
      staffPool,
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

describe('dedupeStaffCardOccurrences', () => {
  it('CASE F: mesmo evento em Cartões + Ocorrências conta uma vez', () => {
    const cards = parseStaffCardsForMatch(
      {
        occurrencesText: 'Cartão amarelo para o técnico João Silva.',
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
          awayTeam: 'NAC',
          clubName: 'Boston City',
          aliases: ['BOSTON'],
        },
      },
      [{ id: 'tec-1', name: 'João Silva', role: 'tecnico', licenseNumber: null }],
    );
    expect(cards).toHaveLength(1);
    expect(cards[0]?.yellowCards).toBe(1);
  });

  it('CASE G: dois amarelos legítimos no mesmo jogo permanecem', () => {
    const cards = dedupeStaffCardOccurrences([
      {
        staffId: 'tec-1',
        name: 'João Silva',
        roleLabel: 'Técnico',
        yellowCards: 1,
        redCards: 0,
        excerpt: '20:00 1T Técnico João Silva',
      },
      {
        staffId: 'tec-1',
        name: 'João Silva',
        roleLabel: 'Técnico',
        yellowCards: 1,
        redCards: 0,
        excerpt: '70:00 2T Técnico João Silva',
      },
    ]);
    expect(cards).toHaveLength(2);
  });
});

describe('match-specific role', () => {
  it('CASE H: exibe função da partida, não default do cadastro', () => {
    const cards = parseStaffCardsForMatch(
      {
        staffCardEvents: [
          {
            kind: 'yellow',
            roleLabel: 'Massagista',
            name: 'José Silva',
            excerpt: '15:00 1T Massagista José Silva',
            teamSide: 'home',
          },
        ],
        clubFilter: {
          homeTeam: 'BOSTON',
          awayTeam: 'NAC',
          clubName: 'Boston City',
          aliases: ['BOSTON'],
        },
      },
      [joseU20],
    );
    expect(cards[0]?.roleLabel).toBe('Massagista');
  });

  it('CASE I: fallback para Press Kit quando súmula não traz função', () => {
    const cards = parseStaffCardsFromOccurrences(
      'Cartão amarelo para membro da comissão técnica José Silva.',
      [joseU20],
      { pressKitRoleOverrides: { 'staff-jose': 'massagista' } },
    );
    expect(cards[0]?.roleLabel).toBe('Massagista');
  });
});

describe('registration resolution', () => {
  it('CASE J: registro único resolve TechnicalStaff correto', () => {
    const member = resolveStaffByRegistration('123456', staffPool);
    expect(member?.id).toBe('staff-jose');
  });

  it('CASE K: registro duplicado não escolhe arbitrariamente', () => {
    const ambiguities: string[] = [];
    const member = resolveStaffByRegistration('123456', [joseU20, joseDuplicateReg], {
      onAmbiguous: (detail) => ambiguities.push(detail.type),
    });
    expect(member).toBeNull();
    expect(ambiguities).toContain('duplicate_registration');
  });

  it('CASE L: sem registro, fallback por nome continua funcionando', () => {
    const member = resolveStaffDisciplineMember('Cartão amarelo Carlos Souza', 'Carlos Souza', staffPool);
    expect(member?.id).toBe('aux-1');
  });
});

describe('parseStaffCardsForMatch cross-category', () => {
  it('combina cartões distintos de pessoas diferentes', () => {
    const cards = parseStaffCardsForMatch(
      {
        occurrencesText: 'Cartão amarelo para o auxiliar técnico Carlos Souza.',
        staffCardEvents: [
          {
            kind: 'yellow',
            roleLabel: 'Técnico',
            name: 'José Silva',
            excerpt: '10:00 1T Técnico José Silva',
            teamSide: 'home',
          },
        ],
        clubFilter: {
          homeTeam: 'BOSTON',
          awayTeam: 'NAC',
          clubName: 'Boston City',
          aliases: ['BOSTON'],
        },
      },
      staffPool,
    );
    expect(cards).toHaveLength(2);
    expect(cards.some((c) => c.staffId === 'staff-jose')).toBe(true);
    expect(cards.some((c) => c.staffId === 'aux-1')).toBe(true);
  });
});

describe('aggregateStaffDisciplineRows', () => {
  it('agrega cartões por membro da comissão com categoria da partida', () => {
    const rows = aggregateStaffDisciplineRows([
      {
        staffId: 'staff-jose',
        name: 'José Silva',
        roleLabel: 'Técnico',
        yellowCards: 1,
        redCards: 0,
        excerpt: 'a',
        matchDate: '2026-08-10',
        matchLabel: 'Jogo U17',
        matchCategory: 'sub17',
      },
      {
        staffId: 'staff-jose',
        name: 'José Silva',
        roleLabel: 'Auxiliar técnico',
        yellowCards: 1,
        redCards: 0,
        excerpt: 'b',
        matchDate: '2026-08-17',
        matchLabel: 'Jogo U20',
        matchCategory: 'sub20',
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.yellowCards).toBe(2);
    expect(rows[0]?.matches).toHaveLength(2);
    expect(rows[0]?.matches[0]?.matchCategory).toBe('sub17');
  });
});
