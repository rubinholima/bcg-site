import { passageirosFromTravelScope } from './passageiros-travel-scope.util';

describe('passageirosFromTravelScope', () => {
  it('H — viagem sem participantes nem quartos → empty (sem fallback de clube)', () => {
    expect(
      passageirosFromTravelScope({
        participantCount: 0,
        roomPlayerCount: 0,
        roomStaffCount: 0,
      }),
    ).toBe('empty');
  });

  it('prioriza convocação quando existir', () => {
    expect(
      passageirosFromTravelScope({
        participantCount: 3,
        roomPlayerCount: 0,
        roomStaffCount: 0,
      }),
    ).toBe('convocation');
  });

  it('usa quartos quando não há convocação mas há ocupantes', () => {
    expect(
      passageirosFromTravelScope({
        participantCount: 0,
        roomPlayerCount: 2,
        roomStaffCount: 0,
      }),
    ).toBe('rooms');
  });
});
