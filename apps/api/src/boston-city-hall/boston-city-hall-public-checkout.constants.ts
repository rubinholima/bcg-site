import type { EventTicketOrderStatus } from './boston-city-hall-ticket-orders.constants';

export type BchPublicPaymentStatus = 'pending' | 'paid' | 'cancelled' | 'expired' | 'unknown';

export type BchPublicOrderItemDto = {
  ticketTypeName: string;
  lotName: string | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
};

export type BchPublicOrderEventDto = {
  slug: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  detailPath: string;
};

export type BchPublicOrderDto = {
  orderNumber: string;
  publicAccessToken: string;
  status: EventTicketOrderStatus;
  paymentStatus: BchPublicPaymentStatus;
  holdExpiresAt: string | null;
  subtotal: string;
  total: string;
  currency: string;
  customerName: string;
  customerEmail: string;
  event: BchPublicOrderEventDto;
  items: BchPublicOrderItemDto[];
  orderPath: string;
};

export const BCH_PUBLIC_CHECKOUT_FORBIDDEN_BODY_KEYS = [
  'total',
  'subtotal',
  'unitPrice',
  'currency',
  'discount',
  'fees',
  'price',
  'tenantId',
  'eventId',
  'payment',
  'status',
] as const;

export function mapPaymentToPublicStatus(
  orderStatus: EventTicketOrderStatus,
  paymentStatus: string | null | undefined,
): BchPublicPaymentStatus {
  if (orderStatus === 'expired') return 'expired';
  if (orderStatus === 'cancelled') return 'cancelled';
  if (paymentStatus === 'paid' || orderStatus === 'confirmed') return 'paid';
  if (orderStatus === 'pending') return 'pending';
  return 'unknown';
}
