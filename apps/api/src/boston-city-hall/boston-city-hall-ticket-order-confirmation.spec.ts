import { evaluateTicketOrderConfirmation } from './boston-city-hall-ticket-order-confirmation';

describe('evaluateTicketOrderConfirmation', () => {
  const now = new Date('2026-01-15T12:00:00.000Z');
  const holdValid = new Date('2026-01-15T12:30:00.000Z');
  const holdExpired = new Date('2026-01-15T11:00:00.000Z');

  it('confirma pedido pending com hold válido', () => {
    expect(
      evaluateTicketOrderConfirmation({
        orderStatus: 'pending',
        holdExpiresAt: holdValid,
        now,
      }),
    ).toBe('confirmed');
  });

  it('exige reconciliação quando hold expirou', () => {
    expect(
      evaluateTicketOrderConfirmation({
        orderStatus: 'pending',
        holdExpiresAt: holdExpired,
        now,
      }),
    ).toBe('reconciliation_hold_expired');
  });

  it('idempotente quando já confirmado', () => {
    expect(
      evaluateTicketOrderConfirmation({
        orderStatus: 'confirmed',
        holdExpiresAt: holdExpired,
        now,
      }),
    ).toBe('already_confirmed');
  });
});
