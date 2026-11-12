import { applyCompletionPatch } from './live-tag-capture.util';

describe('live-tag-capture', () => {
  it('completar detalhes não desloca startMs', () => {
    const stamped = { startMs: 12050, matchClockSeconds: 734 };
    const completed = applyCompletionPatch(stamped, { fieldZoneKey: 'cent_meio', playerId: 'p1' });
    expect(completed.startMs).toBe(12050);
    expect(completed.matchClockSeconds).toBe(734);
    expect(completed.fieldZoneKey).toBe('cent_meio');
  });
});
