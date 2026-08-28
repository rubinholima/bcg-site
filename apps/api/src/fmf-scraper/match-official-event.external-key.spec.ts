import {
  buildPlayerCardExternalKey,
  buildPlayerGoalExternalKey,
  buildPlayerSubstitutionExternalKey,
  buildStaffCardExternalKey,
} from './match-official-event.external-key';

describe('match-official-event.external-key', () => {
  it('gera chave estável para cartão amarelo', () => {
    const key = buildPlayerCardExternalKey({
      kind: 'yellow',
      teamSide: 'away',
      period: '2T',
      clock: '42:00',
      jerseyNumber: 4,
      sequence: 0,
    });
    expect(key).toBe('fmf:PLAYER_YELLOW_CARD:away:2T:42:00:4:0');
  });

  it('diferencia dois amarelos do mesmo jogador', () => {
    const a = buildPlayerCardExternalKey({
      kind: 'yellow',
      teamSide: 'home',
      period: '1T',
      clock: '20:00',
      jerseyNumber: 10,
      sequence: 0,
    });
    const b = buildPlayerCardExternalKey({
      kind: 'yellow',
      teamSide: 'home',
      period: '2T',
      clock: '70:00',
      jerseyNumber: 10,
      sequence: 0,
    });
    expect(a).not.toBe(b);
  });

  it('gera chave para substituição única', () => {
    expect(
      buildPlayerSubstitutionExternalKey({
        teamSide: 'home',
        period: '2T',
        clock: '25:00',
        outJersey: 9,
        inJersey: 15,
      }),
    ).toBe('fmf:PLAYER_SUBSTITUTION:home:2T:25:00:9:15');
  });

  it('gera chave para gol de pênalti', () => {
    expect(
      buildPlayerGoalExternalKey({
        goalType: 'penalty',
        teamSide: 'away',
        period: '2T',
        clock: '47:00',
        jerseyNumber: 9,
      }),
    ).toContain('PLAYER_PENALTY_GOAL');
  });

  it('gera chave staff independente de TechnicalStaff.id', () => {
    const key = buildStaffCardExternalKey({
      kind: 'yellow',
      teamSide: 'away',
      period: '2T',
      clock: '20:00',
      roleLabel: 'Técnico',
      name: 'Adriano Dos Santos Almeida',
    });
    expect(key).toMatch(/^fmf:STAFF_YELLOW_CARD:away:2T:20:00:/);
    expect(key).not.toContain('cuid');
  });
});
