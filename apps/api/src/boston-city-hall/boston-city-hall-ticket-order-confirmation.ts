/** Resultado da confirmação idempotente pedido ← pagamento pago. */
export type TicketOrderConfirmOutcome =
  | 'confirmed'
  | 'already_confirmed'
  | 'reconciliation_hold_expired'
  | 'reconciliation_order_not_pending';

export function evaluateTicketOrderConfirmation(params: {
  orderStatus: string;
  holdExpiresAt: Date | null;
  now: Date;
}): TicketOrderConfirmOutcome {
  const { orderStatus, holdExpiresAt, now } = params;
  if (orderStatus === 'confirmed') return 'already_confirmed';
  if (orderStatus !== 'pending') return 'reconciliation_order_not_pending';
  if (!holdExpiresAt || holdExpiresAt <= now) return 'reconciliation_hold_expired';
  return 'confirmed';
}
