import { computePlayerMetrics, computeTeamMetrics } from './performance-analysis-metrics.util';

describe('performance-analysis-metrics.util', () => {
  it('agrega métricas coletivas a partir de eventos', () => {
    const team = computeTeamMetrics([
      { tagKey: 'passe', tagLabel: 'Passe', outcome: 'certo', playerId: 'p1' },
      { tagKey: 'passe', tagLabel: 'Passe', outcome: 'errado', playerId: 'p2' },
      { tagKey: 'finalizacao', tagLabel: 'Finalização', outcome: 'gol', playerId: 'p1' },
      { tagKey: 'recuperacao', tagLabel: 'Recuperação', outcome: 'neutro', playerId: null },
      { tagKey: 'perda', tagLabel: 'Perda', outcome: 'neutro', playerId: 'p1' },
    ]);
    expect(team.totalTagged).toBe(5);
    expect(team.passAttempts).toBe(2);
    expect(team.passSuccess).toBe(1);
    expect(team.passFailure).toBe(1);
    expect(team.passAccuracyPct).toBe(50);
    expect(team.shots).toBe(1);
    expect(team.recoveries).toBe(1);
    expect(team.losses).toBe(1);
  });

  it('agrega métricas por atleta incluindo duelos', () => {
    const players = computePlayerMetrics([
      { tagKey: 'duelo', tagLabel: 'Duelo', outcome: 'vencido', playerId: 'p1' },
      { tagKey: 'duelo', tagLabel: 'Duelo', outcome: 'perdido', playerId: 'p1' },
      { tagKey: 'passe', tagLabel: 'Passe', outcome: 'certo', playerId: 'p2' },
    ]);
    const p1 = players.find((p) => p.playerId === 'p1');
    expect(p1?.duels).toBe(2);
    expect(p1?.duelsWon).toBe(1);
    expect(players.find((p) => p.playerId === 'p2')?.passAttempts).toBe(1);
  });
});
