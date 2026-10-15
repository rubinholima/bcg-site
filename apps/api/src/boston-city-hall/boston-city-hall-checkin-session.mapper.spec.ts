import {
  checkinStationLabel,
  mapCheckinSession,
} from './boston-city-hall-checkin-session.mapper';

describe('mapCheckinSession', () => {
  const base = {
    id: 'sess-1',
    tenantId: 't1',
    eventId: 'ev1',
    stationId: 'st-1',
    operatorUserId: null,
    deviceLabel: 'Tablet',
    status: 'open',
    openedAt: new Date('2026-10-15T12:00:00.000Z'),
    closedAt: null,
    acceptedCount: 2,
    duplicateCount: 1,
    rejectedCount: 0,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('mapeia estação quando relação existe', () => {
    const dto = mapCheckinSession({
      ...base,
      station: {
        id: 'st-1',
        tenantId: 't1',
        eventId: 'ev1',
        name: 'Portão A',
        location: 'Entrada principal',
        deviceLabel: null,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    expect(dto?.station.name).toBe('Portão A');
    expect(dto?.stationMissing).toBe(false);
    expect(dto?.acceptedCount).toBe(2);
  });

  it('não quebra quando estação está ausente', () => {
    const dto = mapCheckinSession({ ...base, station: null });
    expect(dto?.stationMissing).toBe(true);
    expect(dto?.station.name).toBe('Estação indisponível');
    expect(dto?.station.id).toBe('st-1');
  });

  it('retorna null para sessão nula', () => {
    expect(mapCheckinSession(null)).toBeNull();
  });
});

describe('checkinStationLabel', () => {
  it('monta rótulo com local', () => {
    expect(
      checkinStationLabel({
        id: '1',
        name: 'Portão',
        location: 'Hall',
        active: true,
      }),
    ).toBe('Portão · Hall');
  });
});
