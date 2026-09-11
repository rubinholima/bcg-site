import {
  buildDisciplineCardEventDrafts,
  planDisciplineEventOperations,
} from './fmf-discipline-only-repair.sync';
import { buildPlayerLinkPool } from './match-official-event.identity';
import type { ParsedFmfMatchReport } from './fmf-match-report.parser';

describe('planDisciplineEventOperations', () => {
  const parsed: ParsedFmfMatchReport = {
    homeTeam: 'A',
    awayTeam: 'Boston City',
    competition: 'SUB 13',
    category: 'sub13',
    season: 2026,
    phase: null,
    round: 1,
    homeScore: 1,
    awayScore: 0,
    firstHalfMinutes: 45,
    secondHalfMinutes: 45,
    totalMinutes: 90,
    occurrencesText: '',
    occurrences: [],
    roster: [],
    staffRoster: [],
    playerGoalEvents: [{ teamSide: 'away', jerseyNumber: 9, clock: '10:00', period: '1T', minute: 10, excerpt: 'gol', goalType: 'normal' }],
    substitutionEvents: [],
    stats: [],
    playerCardEvents: [
      {
        kind: 'yellow',
        teamSide: 'away',
        jerseyNumber: 3,
        cbfRegistration: '964959',
        sourceName: 'Marcos',
        clock: '32:00',
        period: '2T',
        minute: 32,
        excerpt: 'y1',
      },
    ],
    staffCardEvents: [],
  };

  it('não propõe operações em gols existentes', () => {
    const drafts = buildDisciplineCardEventDrafts({
      parsed,
      ourTeamSide: 'away',
      playerPool: buildPlayerLinkPool([
        { id: 'p1', name: 'Marcos', cbfRegistration: '964959', registrationProfile: null },
      ]),
      staffPool: [],
    });
    const operations = planDisciplineEventOperations({
      existingEvents: [
        {
          id: 'goal-1',
          factType: 'PLAYER_GOAL',
          provenance: 'fmf_official',
          externalKey: 'goal-key',
          playerId: 'p1',
          technicalStaffId: null,
          sourceClock: '10:00',
          period: '1T',
          sourceSections: ['Gols'],
          sourceExcerpt: 'gol',
        },
      ],
      drafts,
    });
    expect(operations.every((op) => op.factType.includes('CARD'))).toBe(true);
    expect(operations.some((op) => op.externalKey === 'goal-key')).toBe(false);
  });

  it('enumera CREATE para cartão novo', () => {
    const drafts = buildDisciplineCardEventDrafts({
      parsed,
      ourTeamSide: 'away',
      playerPool: buildPlayerLinkPool([
        { id: 'p1', name: 'Marcos', cbfRegistration: '964959', registrationProfile: null },
      ]),
      staffPool: [],
    });
    const operations = planDisciplineEventOperations({ existingEvents: [], drafts });
    expect(operations[0]?.op).toBe('CREATE');
  });
});
