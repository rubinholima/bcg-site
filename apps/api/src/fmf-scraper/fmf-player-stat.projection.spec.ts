import { projectPlayerStatsFromOfficialFacts } from './fmf-player-stat.projection';
import type { FmfReportRosterPlayer } from './fmf-match-report.parser';
import type { MatchOfficialEventDraft } from './match-official-event.types';

describe('fmf-player-stat.projection', () => {
  const roster: FmfReportRosterPlayer[] = [
    {
      jerseyNumber: 10,
      cbfRegistration: '100',
      sourceName: 'Titular',
      starter: true,
      teamSide: 'home',
    },
    {
      jerseyNumber: 15,
      cbfRegistration: '200',
      sourceName: 'Reserva',
      starter: false,
      teamSide: 'home',
    },
  ];

  it('titular joga o jogo inteiro', () => {
    const stats = projectPlayerStatsFromOfficialFacts({
      roster,
      ourTeamSide: 'home',
      totalMinutes: 90,
      firstHalfMinutes: 45,
      events: [],
    });
    const starter = stats.find((s) => s.jerseyNumber === 10)!;
    expect(starter.minutesPlayed).toBe(90);
    expect(starter.played).toBe(true);
  });

  it('reserva não jogou sem substituição', () => {
    const stats = projectPlayerStatsFromOfficialFacts({
      roster,
      ourTeamSide: 'home',
      totalMinutes: 90,
      firstHalfMinutes: 45,
      events: [],
    });
    const bench = stats.find((s) => s.jerseyNumber === 15)!;
    expect(bench.minutesPlayed).toBe(0);
    expect(bench.played).toBe(false);
  });

  it('substituição ajusta minutos', () => {
    const events: MatchOfficialEventDraft[] = [
      {
        factType: 'PLAYER_SUBSTITUTION',
        provenance: 'fmf_official',
        playerId: 'p10',
        relatedPlayerId: 'p15',
        resolutionStatus: 'resolved',
        sourceJerseyNumber: 10,
        relatedJerseyNumber: 15,
        sourceTeamSide: 'home',
        minute: 60,
        period: '2T',
        externalKey: 'sub1',
      },
    ];
    const stats = projectPlayerStatsFromOfficialFacts({
      roster,
      ourTeamSide: 'home',
      totalMinutes: 90,
      firstHalfMinutes: 45,
      events,
    });
    expect(stats.find((s) => s.jerseyNumber === 10)!.minutesPlayed).toBe(60);
    expect(stats.find((s) => s.jerseyNumber === 15)!.minutesPlayed).toBe(30);
  });

  it('vermelho encerra participação', () => {
    const events: MatchOfficialEventDraft[] = [
      {
        factType: 'PLAYER_RED_CARD',
        provenance: 'fmf_official',
        playerId: 'p10',
        resolutionStatus: 'resolved',
        sourceJerseyNumber: 10,
        sourceTeamSide: 'home',
        minute: 70,
        period: '2T',
        externalKey: 'red1',
      },
    ];
    const stats = projectPlayerStatsFromOfficialFacts({
      roster,
      ourTeamSide: 'home',
      totalMinutes: 90,
      firstHalfMinutes: 45,
      events,
    });
    expect(stats.find((s) => s.jerseyNumber === 10)!.minutesPlayed).toBe(70);
  });

  it('reserva recebe cartão sem entrar — played=false, minutes=0', () => {
    const events: MatchOfficialEventDraft[] = [
      {
        factType: 'PLAYER_YELLOW_CARD',
        provenance: 'fmf_official',
        playerId: 'p15',
        resolutionStatus: 'resolved',
        sourceJerseyNumber: 15,
        sourceTeamSide: 'home',
        minute: 80,
        period: '2T',
        sourceClock: '80:00',
        externalKey: 'bench-yellow',
      },
    ];
    const stats = projectPlayerStatsFromOfficialFacts({
      roster,
      ourTeamSide: 'home',
      totalMinutes: 90,
      firstHalfMinutes: 45,
      events,
    });
    const bench = stats.find((s) => s.jerseyNumber === 15)!;
    expect(bench.yellowCards).toBe(1);
    expect(bench.played).toBe(false);
    expect(bench.minutesPlayed).toBe(0);
  });

  it('dois amarelos encerram participação no segundo', () => {
    const events: MatchOfficialEventDraft[] = [
      {
        factType: 'PLAYER_YELLOW_CARD',
        provenance: 'fmf_official',
        playerId: 'p10',
        resolutionStatus: 'resolved',
        sourceJerseyNumber: 10,
        sourceTeamSide: 'home',
        minute: 20,
        period: '1T',
        externalKey: 'y1',
      },
      {
        factType: 'PLAYER_YELLOW_CARD',
        provenance: 'fmf_official',
        playerId: 'p10',
        resolutionStatus: 'resolved',
        sourceJerseyNumber: 10,
        sourceTeamSide: 'home',
        minute: 55,
        period: '2T',
        externalKey: 'y2',
      },
    ];
    const stats = projectPlayerStatsFromOfficialFacts({
      roster,
      ourTeamSide: 'home',
      totalMinutes: 90,
      firstHalfMinutes: 45,
      events,
    });
    expect(stats.find((s) => s.jerseyNumber === 10)!.minutesPlayed).toBe(55);
    expect(stats.find((s) => s.jerseyNumber === 10)!.yellowCards).toBe(2);
    expect(stats.find((s) => s.jerseyNumber === 10)!.redCards).toBe(0);
  });
});
