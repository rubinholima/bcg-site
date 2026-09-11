import {
  mergeTransferDisciplineOpenings,
  readClubArrivalDateKey,
} from './player-discipline-opening.util';

describe('player-discipline-opening.util', () => {
  it('lê clubArrivalDate do cadastro', () => {
    expect(
      readClubArrivalDateKey({
        personal: { clubArrivalDate: '2026-07-06' },
      }),
    ).toBe('2026-07-06');
  });

  it('aplica saldo zero automático na chegada quando não há saldo manual', () => {
    const merged = mergeTransferDisciplineOpenings(
      new Map([
        [
          'manual',
          { effectiveFrom: '2026-08-01', yellowAccum: 2, suspensionRoundsLeft: 0 },
        ],
      ]),
      [
        { id: 'manual', registrationProfile: { personal: { clubArrivalDate: '2026-07-01' } } },
        { id: 'transfer', registrationProfile: { personal: { clubArrivalDate: '2026-07-06' } } },
      ],
    );
    expect(merged.get('manual')).toEqual({
      effectiveFrom: '2026-08-01',
      yellowAccum: 2,
      suspensionRoundsLeft: 0,
    });
    expect(merged.get('transfer')).toEqual({
      effectiveFrom: '2026-07-06',
      yellowAccum: 0,
      suspensionRoundsLeft: 0,
    });
  });
});
