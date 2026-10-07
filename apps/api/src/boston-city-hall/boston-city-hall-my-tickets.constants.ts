import type { BchPublicOrderEventDto, BchPublicOrderItemDto } from './boston-city-hall-public-checkout.constants';
import type { BchPublicTicketDto } from './boston-city-hall-public-tickets.constants';
import { bchPublicOrderPath } from './boston-city-hall-public-events.constants';

export const BCH_MY_TICKETS_COOKIE = 'bch_my_tickets_sess';

export const BCH_MAGIC_LINK_TTL_MS = 15 * 60 * 1000;
export const BCH_MY_TICKETS_SESSION_TTL_MS = 2 * 60 * 60 * 1000;

export const BCH_PASSWORDLESS_NEUTRAL_MESSAGE =
  'Se este e-mail tiver ingressos elegíveis, enviaremos um link de acesso em instantes.';

export type BchMyTicketsOrderSummaryDto = {
  orderNumber: string;
  publicAccessToken: string;
  confirmedAt: string | null;
  total: string;
  currency: string;
  event: BchPublicOrderEventDto;
  items: BchPublicOrderItemDto[];
  ticketCount: number;
  tickets: BchPublicTicketDto[];
  orderPath: string;
};

export type BchMyTicketsListDto = {
  email: string;
  orders: BchMyTicketsOrderSummaryDto[];
};

export function bchMyTicketsAccessPath(rawMagicToken: string): string {
  return `/portfolio/boston-city-hall/my-tickets/access?token=${encodeURIComponent(rawMagicToken)}`;
}

export function bchMyTicketsPagePath(): string {
  return '/portfolio/boston-city-hall/my-tickets';
}

export function buildMyTicketsOrderPath(publicAccessToken: string): string {
  return bchPublicOrderPath(publicAccessToken);
}
