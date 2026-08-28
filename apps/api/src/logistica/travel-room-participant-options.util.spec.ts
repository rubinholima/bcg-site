import {
  buildTravelRoomParticipantOptions,
  mergePreservedRoomOccupantOptions,
} from './travel-room-participant-options.util';

describe('buildTravelRoomParticipantOptions', () => {
  const clubPlayers = Array.from({ length: 150 }, (_, i) => ({
    personType: 'player',
    playerId: `club-${i}`,
    player: { id: `club-${i}`, name: `Atleta ${i}`, category: 'u15' },
  }));

  it('A — viagem com 22 atletas retorna somente esses 22', () => {
    const tripPlayers = Array.from({ length: 22 }, (_, i) => ({
      personType: 'player',
      playerId: `trip-${i}`,
      player: { id: `trip-${i}`, name: `Convocado ${i}`, category: i % 2 === 0 ? 'u17' : 'u15' },
    }));

    const options = buildTravelRoomParticipantOptions(tripPlayers);
    expect(options).toHaveLength(22);
    expect(options.every((o) => o.type === 'player')).toBe(true);
    expect(options.some((o) => o.id.startsWith('club-'))).toBe(false);
    expect(buildTravelRoomParticipantOptions(clubPlayers)).toHaveLength(150);
  });

  it('B — atleta U15 incluído na viagem U17 aparece', () => {
    const options = buildTravelRoomParticipantOptions([
      {
        personType: 'player',
        playerId: 'p-subida',
        player: { id: 'p-subida', name: 'João Subida', category: 'u15' },
      },
    ]);
    expect(options).toEqual([
      expect.objectContaining({ id: 'p-subida', label: 'João Subida', type: 'player' }),
    ]);
  });

  it('C — atleta fora da viagem não entra na lista', () => {
    const options = buildTravelRoomParticipantOptions([
      {
        personType: 'player',
        playerId: 'p-in',
        player: { id: 'p-in', name: 'Dentro', category: 'u17' },
      },
    ]);
    expect(options.find((o) => o.id === 'p-out')).toBeUndefined();
  });

  it('D — comissão incluída na viagem aparece', () => {
    const options = buildTravelRoomParticipantOptions([
      {
        personType: 'staff',
        staffId: 's1',
        staff: { id: 's1', name: 'José', role: 'Auxiliar Técnico' },
      },
    ]);
    expect(options[0]).toMatchObject({ type: 'staff', id: 's1', label: 'José' });
  });

  it('E — comissão fora da viagem não entra', () => {
    expect(buildTravelRoomParticipantOptions([])).toEqual([]);
  });

  it('F — convidado incluído na viagem entra no rooming geral', () => {
    const options = buildTravelRoomParticipantOptions([
      {
        personType: 'guest',
        logisticsGuestId: 'g1',
        logisticsGuest: { id: 'g1', name: 'Convidado VIP' },
      },
    ]);
    expect(options[0]).toMatchObject({ type: 'guest', id: 'g1', label: 'Convidado VIP' });
  });

  it('G — opções de atleta não incluem convidado', () => {
    const options = buildTravelRoomParticipantOptions([
      {
        personType: 'player',
        playerId: 'p1',
        player: { id: 'p1', name: 'Atleta', category: 'u17' },
      },
      {
        personType: 'guest',
        logisticsGuestId: 'g1',
        logisticsGuest: { id: 'g1', name: 'Convidado' },
      },
    ]);
    const playersOnly = options.filter((o) => o.type === 'player');
    expect(playersOnly).toHaveLength(1);
    expect(options.some((o) => o.type === 'guest')).toBe(true);
  });

  it('H — viagem vazia não retorna opções do clube', () => {
    expect(buildTravelRoomParticipantOptions([])).toEqual([]);
  });
});

describe('mergePreservedRoomOccupantOptions', () => {
  it('J — preserva ocupante já gravado no quarto', () => {
    const merged = mergePreservedRoomOccupantOptions(
      [],
      [{ personId: 'legacy-1', personName: 'Antigo Ocupante', personType: 'player' }],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.value).toBe('player:legacy-1');
  });
});
