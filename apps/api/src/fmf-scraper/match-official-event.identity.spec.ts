import {
  correlateStaffCardWithOfficialRoster,
  resolvePlayerForJerseyEvent,
  buildPlayerLinkPool,
} from './match-official-event.identity';
import type { FmfReportRosterPlayer, FmfReportStaffRosterEntry } from './fmf-match-report.parser';

describe('match-official-event.identity', () => {
  const players = [
    { id: 'p1', name: 'Joao Victor Machado', cbfRegistration: '776375' },
    { id: 'p2', name: 'Outro Atleta', cbfRegistration: '123456' },
  ];
  const pool = buildPlayerLinkPool(players);

  const roster: FmfReportRosterPlayer[] = [
    {
      jerseyNumber: 4,
      cbfRegistration: '776375',
      sourceName: 'Joao Victor Machado De Oliveira',
      starter: true,
      teamSide: 'away',
    },
  ];

  it('resolve atleta por roster + CBF', () => {
    const result = resolvePlayerForJerseyEvent(roster, 'away', 4, pool);
    expect(result.resolutionStatus).toBe('resolved');
    expect(result.playerId).toBe('p1');
    expect(result.resolutionReason).toBe('ROSTER_CBF');
  });

  it('marca unresolved quando camisa não existe no roster', () => {
    const result = resolvePlayerForJerseyEvent(roster, 'away', 99, pool);
    expect(result.resolutionStatus).toBe('unresolved');
    expect(result.playerId).toBeNull();
  });

  it('correlaciona cartão comissão com roster oficial', () => {
    const staffRoster: FmfReportStaffRosterEntry[] = [
      {
        teamSide: 'away',
        roleLabel: 'Técnico',
        name: 'Adriano Dos Santos Almeida',
        sourceExcerpt: 'Técnico: Adriano Dos Santos Almeida',
      },
    ];
    const hit = correlateStaffCardWithOfficialRoster(
      {
        name: 'Adriano Dos Santos Almeida',
        roleLabel: 'Técnico',
        teamSide: 'away',
      },
      staffRoster,
    );
    expect(hit?.name).toBe('Adriano Dos Santos Almeida');
  });

  it('não correlaciona homônimos ambíguos na comissão', () => {
    const staffRoster: FmfReportStaffRosterEntry[] = [
      { teamSide: 'home', roleLabel: 'Técnico', name: 'José Silva', sourceExcerpt: 'a' },
      { teamSide: 'home', roleLabel: 'Auxiliar técnico', name: 'José Silva', sourceExcerpt: 'b' },
    ];
    const hit = correlateStaffCardWithOfficialRoster(
      { name: 'José Silva', roleLabel: 'Técnico', teamSide: 'home' },
      staffRoster,
    );
    expect(hit).toBeNull();
  });
});
