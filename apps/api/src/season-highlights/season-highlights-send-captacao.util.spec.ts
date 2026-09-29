import { normalizeIdentityKey } from './season-standout.util';

/** Espelha critério idempotente de nome+clube usado no service. */
function sameProspectIdentity(
  a: { name: string; currentClub: string | null },
  b: { displayName: string; lastKnownClub: string | null },
): boolean {
  return (
    normalizeIdentityKey(a.name) === normalizeIdentityKey(b.displayName) &&
    normalizeIdentityKey(a.currentClub ?? '') === normalizeIdentityKey(b.lastKnownClub ?? '')
  );
}

describe('send-to-captacao identity', () => {
  it('dedupe por nome normalizado e clube', () => {
    expect(
      sameProspectIdentity(
        { name: 'Lucas Canella', currentClub: 'Nacional AC' },
        { displayName: 'lucas  canella', lastKnownClub: 'Nacional AC' },
      ),
    ).toBe(true);
  });
});
