import { BadRequestException } from '@nestjs/common';
import type { PaymentStatus } from './payment-core.constants';

const TERMINAL_NO_EXIT: ReadonlySet<PaymentStatus> = new Set([
  'failed',
  'cancelled',
  'expired',
  'refunded',
]);

const ALLOWED_FROM: Record<PaymentStatus, ReadonlySet<PaymentStatus>> = {
  pending: new Set(['processing', 'paid', 'failed', 'cancelled', 'expired']),
  processing: new Set(['authorized', 'paid', 'failed', 'cancelled', 'expired']),
  authorized: new Set(['paid', 'failed', 'cancelled']),
  paid: new Set(['partially_refunded', 'refunded']),
  partially_refunded: new Set(['partially_refunded', 'refunded']),
  failed: new Set(),
  cancelled: new Set(),
  expired: new Set(),
  refunded: new Set(),
};

export function assertPaymentStatusTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (from === to) return;
  if (TERMINAL_NO_EXIT.has(from)) {
    throw new BadRequestException(`Pagamento em estado terminal "${from}" não pode mudar para "${to}".`);
  }
  const allowed = ALLOWED_FROM[from];
  if (!allowed?.has(to)) {
    throw new BadRequestException(`Transição de status inválida: ${from} → ${to}.`);
  }
}

export function isPaymentStatus(value: string): value is PaymentStatus {
  return (ALLOWED_FROM as Record<string, unknown>)[value] !== undefined;
}
