import {
  buildFallbackIdentityKey,
  resolveOpponentIdentityFromFmf,
} from './fmf-opponent-roster-resolve.util';

describe('fmf-opponent-roster-resolve.util', () => {
  const sampleParsed = {
    competition: 'Mineiro',
    phase: null,
    round: 1,
    category: 'Sub-20',
    season: 2026,
    matchDate: '2026-08-10',
    kickoffTime: '15:00',
    homeTeam: 'BOSTON CITY FUTEBOL CLUBE SAF',
    awayTeam: 'NACIONAL ATLETICO CLUBE',
    homeScore: 1,
    awayScore: 0,
    firstHalfMinutes: 45,
    secondHalfMinutes: 45,
    totalMinutes: 90,
    roster: [
      {
        jerseyNumber: 4,
        cbfRegistration: '776375',
        sourceName: 'Joao Victor Machado De Oliveira',
        starter: true,
        teamSide: 'away' as const,
      },
    ],
    stats: [
      {
        jerseyNumber: 4,
        cbfRegistration: '776375',
        sourceName: 'Joao Victor Machado De Oliveira',
        starter: true,
        teamSide: 'away' as const,
        played: true,
        enteredMinute: null,
        exitedMinute: null,
        minutesPlayed: 90,
        goals: 0,
        ownGoals: 0,
        penaltyGoals: 0,
        yellowCards: 1,
        redCards: 0,
      },
    ],
    staffRoster: [],
    playerGoalEvents: [],
    playerCardEvents: [],
    substitutionEvents: [],
    staffCardEvents: [],
    occurrencesText: null,
    occurrences: [],
  };

  it('resolve adversário pelo lado oposto ao clube e camisa', () => {
    const resolved = resolveOpponentIdentityFromFmf({
      rawParsed: sampleParsed,
      homeTeam: sampleParsed.homeTeam,
      awayTeam: sampleParsed.awayTeam,
      clubName: 'Boston City',
      clubAliases: ['BOSTON CITY FUTEBOL CLUBE SAF'],
      jerseyNumber: 4,
    });
    expect(resolved.cbfRegistration).toBe('776375');
    expect(resolved.sourceName).toContain('Joao Victor');
    expect(resolved.identitySource).toBe('cbf');
    expect(resolved.opponentClub).toContain('NACIONAL');
  });

  it('fallback identity não usa camisa sozinha', () => {
    const keyA = buildFallbackIdentityKey({
      tenantId: 't1',
      opponentClub: 'Clube A',
      resolvedName: null,
      staffNotes: 'Volante forte na saída de bola',
      opponentHighlightId: 'h1',
    });
    const keyB = buildFallbackIdentityKey({
      tenantId: 't1',
      opponentClub: 'Clube A',
      resolvedName: null,
      staffNotes: 'Volante forte na saída de bola',
      opponentHighlightId: 'h2',
    });
    expect(keyA).toBe(keyB);
    expect(keyA).not.toMatch(/^event:/);
  });
});
