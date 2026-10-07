import {
  aggregateCheckinResults,
  aggregateTickets,
  computeRemainingCapacity,
  countCapacityConsumed,
  isConfirmedCommercialOrder,
  sumConfirmedOrderTotals,
  ticketsSoldFromConfirmedItems,
  uniqueCheckedInFromTickets,
  type OrderItemRowForSales,
  type OrderRowForSales,
  type TicketRowForReports,
} from './boston-city-hall-ticket-reports.util';

describe('BostonCityHallTicketReportsUtil', () => {
  const paidOrders: OrderRowForSales[] = [
    { status: 'confirmed', total: '100.00', currency: 'USD', createdAt: new Date() },
    { status: 'pending', total: '50.00', currency: 'USD', createdAt: new Date() },
  ];

  const items: OrderItemRowForSales[] = [
    { ticketTypeId: 't1', ticketLotId: null, quantity: 2, totalPrice: '100.00', orderStatus: 'confirmed' },
    { ticketTypeId: 't1', ticketLotId: null, quantity: 1, totalPrice: '50.00', orderStatus: 'pending' },
  ];

  const tickets: TicketRowForReports[] = [
    { status: 'used', admissionSource: 'paid_order', ticketTypeId: 't1', ticketLotId: null, unitPrice: '50.00' },
    { status: 'valid', admissionSource: 'paid_order', ticketTypeId: 't1', ticketLotId: null, unitPrice: '50.00' },
    { status: 'cancelled', admissionSource: 'paid_order', ticketTypeId: 't1', ticketLotId: null, unitPrice: '50.00' },
    {
      status: 'valid',
      admissionSource: 'complimentary',
      ticketTypeId: 't2',
      ticketLotId: null,
      unitPrice: '80.00',
    },
    {
      status: 'used',
      admissionSource: 'complimentary',
      ticketTypeId: 't2',
      ticketLotId: null,
      unitPrice: '80.00',
    },
  ];

  it('paid revenue excludes complimentary and pending orders', () => {
    expect(isConfirmedCommercialOrder('confirmed')).toBe(true);
    expect(isConfirmedCommercialOrder('pending')).toBe(false);
    const sales = sumConfirmedOrderTotals(paidOrders);
    expect(sales.grossSales).toBe(100);
    expect(ticketsSoldFromConfirmedItems(items)).toBe(2);
  });

  it('complimentary face value is separate from commercial revenue', () => {
    const agg = aggregateTickets(tickets);
    expect(agg.faceValueComplimentary).toBe(160);
    const sales = sumConfirmedOrderTotals(paidOrders);
    expect(sales.grossSales).not.toBe(agg.faceValueComplimentary);
  });

  it('no-show excludes cancelled tickets', () => {
    const agg = aggregateTickets(tickets);
    expect(agg.cancelled).toBe(1);
    expect(agg.noShowTotal).toBe(2);
    expect(agg.paidNoShow).toBe(1);
    expect(agg.complimentaryNoShow).toBe(1);
  });

  it('checked-in count uses unique used tickets', () => {
    expect(uniqueCheckedInFromTickets(tickets)).toBe(2);
    const checkins = aggregateCheckinResults([
      { result: 'accepted', ticketId: 'a', ticketTypeName: null, stationLabel: null, operatorUserId: null, createdAt: new Date() },
      { result: 'accepted', ticketId: 'a', ticketTypeName: null, stationLabel: null, operatorUserId: null, createdAt: new Date() },
      { result: 'invalid', ticketId: null, ticketTypeName: null, stationLabel: null, operatorUserId: null, createdAt: new Date() },
    ]);
    expect(checkins.acceptedAttempts).toBe(2);
    expect(uniqueCheckedInFromTickets(tickets)).toBe(2);
  });

  it('rejected scan attempts do not inflate attendance', () => {
    const checkins = aggregateCheckinResults([
      { result: 'already_used', ticketId: 'x', ticketTypeName: null, stationLabel: null, operatorUserId: null, createdAt: new Date() },
      { result: 'invalid', ticketId: null, ticketTypeName: null, stationLabel: null, operatorUserId: null, createdAt: new Date() },
    ]);
    expect(checkins.acceptedAttempts).toBe(0);
    expect(uniqueCheckedInFromTickets(tickets)).toBe(2);
  });

  it('capacity metrics match inventory consumption rule', () => {
    expect(countCapacityConsumed(tickets)).toBe(4);
    expect(computeRemainingCapacity(100, 4, 6)).toBe(90);
  });

  it('complimentary tickets never add to confirmed order revenue', () => {
    const onlyCompItems: OrderItemRowForSales[] = [
      {
        ticketTypeId: 't2',
        ticketLotId: null,
        quantity: 5,
        totalPrice: '0.00',
        orderStatus: 'confirmed',
      },
    ];
    expect(ticketsSoldFromConfirmedItems(onlyCompItems)).toBe(5);
    expect(sumConfirmedOrderTotals(paidOrders).grossSales).toBe(100);
  });
});
