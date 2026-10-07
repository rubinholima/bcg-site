import { validateSeatAssignment } from './boston-city-hall-seating.util';

describe('validateSeatAssignment', () => {
  it('rejeita mesa de outro evento', () => {
    const r = validateSeatAssignment({
      ticketEventId: 'ev1',
      tableEventId: 'ev2',
      seatEventId: null,
      seatTableId: null,
      targetTableId: 'table1',
    });
    expect(r.ok).toBe(false);
  });

  it('rejeita assento de outro evento', () => {
    const r = validateSeatAssignment({
      ticketEventId: 'ev1',
      tableEventId: 'ev1',
      seatEventId: 'ev2',
      seatTableId: 't1',
      targetTableId: 't1',
    });
    expect(r.ok).toBe(false);
  });

  it('rejeita assento fora da mesa', () => {
    const r = validateSeatAssignment({
      ticketEventId: 'ev1',
      tableEventId: 'ev1',
      seatEventId: 'ev1',
      seatTableId: 'table-a',
      targetTableId: 'table-b',
    });
    expect(r.ok).toBe(false);
  });

  it('aceita alocação consistente', () => {
    const r = validateSeatAssignment({
      ticketEventId: 'ev1',
      tableEventId: 'ev1',
      seatEventId: 'ev1',
      seatTableId: 'table-a',
      targetTableId: 'table-a',
    });
    expect(r.ok).toBe(true);
  });
});
