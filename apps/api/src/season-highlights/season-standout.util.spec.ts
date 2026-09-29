import { isPlayerMatchStandout } from './season-standout.util';

describe('season-standout.util', () => {
  it('considera histórico isMatchBest', () => {
    expect(isPlayerMatchStandout({ isMatchBest: true, isStaffStandout: false })).toBe(true);
  });

  it('considera destaque explícito da comissão', () => {
    expect(isPlayerMatchStandout({ isMatchBest: false, isStaffStandout: true })).toBe(true);
  });
});
