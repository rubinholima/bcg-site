import {
  findTransferBoundaryConflicts,
  readClubArrivalDateKey,
} from './player-discipline-opening.util';

describe('readClubArrivalDateKey', () => {
  it('lê clubArrivalDate do cadastro', () => {
    expect(
      readClubArrivalDateKey({ personal: { clubArrivalDate: '2026-07-06' } }),
    ).toBe('2026-07-06');
  });
});

describe('findTransferBoundaryConflicts', () => {
  it('sinaliza cartão anterior à data de chegada', () => {
    const conflicts = findTransferBoundaryConflicts({
      players: [
        {
          id: 'victor',
          registrationProfile: { personal: { clubArrivalDate: '2026-07-06' } },
        },
      ],
      matches: [
        {
          id: 'before',
          matchDate: new Date('2026-06-01T12:00:00Z'),
          playerStats: [
            { playerId: 'victor', yellowCards: 1, redCards: 0 },
          ],
        },
      ],
    });
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.matchId).toBe('before');
  });

  it('ignora conflito quando há abertura manual', () => {
    const conflicts = findTransferBoundaryConflicts({
      players: [
        {
          id: 'victor',
          registrationProfile: { personal: { clubArrivalDate: '2026-07-06' } },
        },
      ],
      matches: [
        {
          id: 'before',
          matchDate: new Date('2026-06-01T12:00:00Z'),
          playerStats: [
            { playerId: 'victor', yellowCards: 2, redCards: 0 },
          ],
        },
      ],
      manualOpeningPlayerIds: new Set(['victor']),
    });
    expect(conflicts).toHaveLength(0);
  });
});
