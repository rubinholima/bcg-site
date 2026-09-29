import {
  computeActualLoad,
  computeCanonicalTrainingMinutesForPlayer,
  type TrainingSessionForMinutes,
} from './prep-load-minutes.util';

const base = (over: Partial<TrainingSessionForMinutes>): TrainingSessionForMinutes => ({
  id: over.id ?? 's1',
  sessionDomain: over.sessionDomain ?? 'comissao_tecnica',
  agendaEntryId: over.agendaEntryId ?? null,
  blockGroupId: over.blockGroupId ?? null,
  blockSequence: over.blockSequence ?? 0,
  startTime: over.startTime ?? '09:00',
  endTime: over.endTime ?? '10:00',
  activities: over.activities ?? [],
  playerEntries: over.playerEntries ?? [{ playerId: 'p1', available: true }],
});

describe('computeCanonicalTrainingMinutesForPlayer', () => {
  it('não conta bloco simultâneo duas vezes (mesma agenda)', () => {
    const sessions = [
      base({ id: 'a', sessionDomain: 'comissao_tecnica', agendaEntryId: 'ag1' }),
      base({ id: 'b', sessionDomain: 'preparacao_fisica', agendaEntryId: 'ag1' }),
    ];
    const r = computeCanonicalTrainingMinutesForPlayer(sessions, 'p1');
    expect(r.total).toBe(60);
  });

  it('soma blocos sequenciais distintos', () => {
    const sessions = [
      base({ id: 'a', blockSequence: 0, startTime: '09:00', endTime: '10:00' }),
      base({ id: 'b', sessionDomain: 'preparacao_fisica', blockSequence: 1, startTime: '10:00', endTime: '10:30' }),
    ];
    const r = computeCanonicalTrainingMinutesForPlayer(sessions, 'p1');
    expect(r.total).toBe(90);
  });

  it('ausente não recebe minutos', () => {
    const sessions = [base({ playerEntries: [{ playerId: 'p1', available: false }] })];
    expect(computeCanonicalTrainingMinutesForPlayer(sessions, 'p1').total).toBe(0);
  });
});

describe('computeActualLoad', () => {
  it('usa RPE × minutos', () => {
    expect(computeActualLoad(7, 60)).toBe(420);
  });
});
