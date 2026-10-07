import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BostonCityHallPublicEventsService } from './boston-city-hall-public-events.service';
import { BostonCityHallTicketOrdersService } from './boston-city-hall-ticket-orders.service';
import { BostonCityHallPublicTicketService } from './boston-city-hall-public-ticket.service';
import type { EventTicketOrderDetailDto } from './boston-city-hall-ticket-orders.constants';
import {
  BCH_PUBLIC_CHECKOUT_FORBIDDEN_BODY_KEYS,
  type BchPublicOrderDto,
  mapPaymentToPublicStatus,
} from './boston-city-hall-public-checkout.constants';
import { assertPublicCheckoutRateLimit } from './boston-city-hall-public-checkout.rate-limit';
import { bchPublicDetailPath, bchPublicOrderPath } from './boston-city-hall-public-events.constants';
import { BCH_VENUE_SLUG } from './boston-city-hall.constants';
import type { BchPublicTicketAvailability } from './boston-city-hall-public-events.constants';

const CHECKOUT_ALLOWED_AVAILABILITY: BchPublicTicketAvailability[] = [
  'AVAILABLE',
  'LOW_AVAILABILITY',
];

export type CreatePublicCheckoutOrderBody = {
  items?: Array<{
    ticketTypeId?: string;
    ticketLotId?: string | null;
    quantity?: number | string;
  }>;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  idempotencyKey?: string;
};

@Injectable()
export class BostonCityHallPublicCheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicEvents: BostonCityHallPublicEventsService,
    private readonly ticketOrders: BostonCityHallTicketOrdersService,
    private readonly publicTickets: BostonCityHallPublicTicketService,
  ) {}

  private rejectForbiddenBodyKeys(body: Record<string, unknown>): void {
    for (const key of BCH_PUBLIC_CHECKOUT_FORBIDDEN_BODY_KEYS) {
      if (key in body && body[key] !== undefined) {
        throw new BadRequestException(`Campo "${key}" não é aceito no checkout público.`);
      }
    }
    const items = body.items;
    if (Array.isArray(items)) {
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        for (const key of ['unitPrice', 'totalPrice', 'price', 'currency'] as const) {
          if (key in item) {
            throw new BadRequestException('Preço informado pelo cliente não é permitido.');
          }
        }
      }
    }
  }

  private async resolvePublishedEventIdBySlug(slug: string): Promise<{
    id: string;
    slug: string;
    name: string;
    startDate: Date | null;
    endDate: Date | null;
  }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: BCH_VENUE_SLUG },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Venue não encontrado.');

    const row = await this.prisma.event.findFirst({
      where: {
        slug: slug.trim(),
        tenantId: tenant.id,
        organizer: 'tenant',
        status: 'published',
      },
      select: {
        id: true,
        slug: true,
        name: true,
        startDate: true,
        endDate: true,
        ticketing: { select: { enabled: true } },
      },
    });
    if (!row) throw new NotFoundException('Evento não encontrado.');
    if (!row.ticketing?.enabled) {
      throw new BadRequestException('Venda de ingressos não está habilitada para este evento.');
    }
    return row;
  }

  private async toPublicOrder(
    detail: EventTicketOrderDetailDto,
    publicAccessToken: string,
    eventDates: { startDate: Date | null; endDate: Date | null },
  ): Promise<BchPublicOrderDto> {
    const paymentStatus = mapPaymentToPublicStatus(
      detail.status,
      detail.payment?.status,
    );
    let tickets: BchPublicOrderDto['tickets'] = [];
    let ticketCount = 0;
    if (detail.status === 'confirmed') {
      const issued = await this.publicTickets.listPublicTicketsForConfirmedOrder(publicAccessToken);
      tickets = issued.tickets;
      ticketCount = issued.ticketCount;
    }

    return {
      orderNumber: detail.orderNumber,
      publicAccessToken,
      status: detail.status,
      paymentStatus,
      holdExpiresAt: detail.holdExpiresAt,
      subtotal: detail.subtotal,
      total: detail.total,
      currency: detail.currency,
      customerName: detail.customerName,
      customerEmail: detail.customerEmail,
      event: {
        slug: detail.eventSlug,
        name: detail.eventName,
        startDate: eventDates.startDate?.toISOString() ?? null,
        endDate: eventDates.endDate?.toISOString() ?? null,
        detailPath: bchPublicDetailPath(detail.eventSlug),
      },
      items: detail.items.map((it) => ({
        ticketTypeName: it.ticketTypeName,
        lotName: it.lotName,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
      })),
      orderPath: bchPublicOrderPath(publicAccessToken),
      confirmedAt: detail.confirmedAt ?? null,
      ticketCount,
      tickets,
    };
  }

  async createOrderForEventSlug(
    eventSlug: string,
    body: CreatePublicCheckoutOrderBody,
    clientIp: string,
  ): Promise<BchPublicOrderDto> {
    if (!body || typeof body !== 'object') {
      throw new BadRequestException('Corpo inválido.');
    }
    this.rejectForbiddenBodyKeys(body as Record<string, unknown>);

    try {
      assertPublicCheckoutRateLimit(clientIp);
    } catch {
      throw new HttpException(
        'Muitas tentativas. Aguarde um momento e tente novamente.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const event = await this.resolvePublishedEventIdBySlug(eventSlug);
    const publicDetail = await this.publicEvents.getBySlug(event.slug);
    if (!publicDetail?.ticketing?.enabled) {
      throw new BadRequestException('Ingressos indisponíveis.');
    }

    const idempotencyKey = body.idempotencyKey?.trim();
    if (!idempotencyKey || idempotencyKey.length < 8) {
      throw new BadRequestException('idempotencyKey é obrigatório.');
    }

    const items = body.items ?? [];
    if (!items.length) throw new BadRequestException('Selecione ao menos um ingresso.');

    for (const line of items) {
      const typeId = line.ticketTypeId?.trim();
      if (!typeId) throw new BadRequestException('Tipo de ingresso inválido.');
      const pubType = publicDetail.ticketing.types.find((t) => t.ticketTypeId === typeId);
      if (!pubType) {
        throw new BadRequestException('Tipo de ingresso não disponível para este evento.');
      }
      if (!CHECKOUT_ALLOWED_AVAILABILITY.includes(pubType.availability)) {
        throw new BadRequestException('Venda não disponível para um dos ingressos selecionados.');
      }
      const lotId = line.ticketLotId?.trim() || null;
      if (pubType.currentLot) {
        if (lotId && lotId !== pubType.currentLot.ticketLotId) {
          throw new BadRequestException('Lote selecionado não está mais disponível.');
        }
      } else if (lotId) {
        throw new BadRequestException('Lote inválido para o tipo selecionado.');
      }
    }

    const customerName = body.customer?.name?.trim();
    const customerEmail = body.customer?.email?.trim();
    if (!customerName || !customerEmail) {
      throw new BadRequestException('Nome e e-mail são obrigatórios.');
    }

    const detail = await this.ticketOrders.createOrder({
      eventId: event.id,
      customer: {
        name: customerName,
        email: customerEmail,
        phone: body.customer?.phone?.trim(),
      },
      items: items.map((it) => ({
        ticketTypeId: it.ticketTypeId!.trim(),
        ticketLotId: it.ticketLotId?.trim() || null,
        quantity: it.quantity ?? 0,
      })),
      checkoutIdempotencyKey: idempotencyKey,
    });

    const tokenRow = await this.prisma.eventTicketOrder.findFirst({
      where: { id: detail.id },
      select: { publicAccessToken: true },
    });
    const token = tokenRow?.publicAccessToken;
    if (!token) {
      throw new ForbiddenException('Pedido criado sem referência pública.');
    }

    return await this.toPublicOrder(detail, token, {
      startDate: event.startDate,
      endDate: event.endDate,
    });
  }

  async getOrderByPublicToken(publicAccessToken: string): Promise<BchPublicOrderDto> {
    const detail = await this.ticketOrders.getOrderByPublicAccessToken(publicAccessToken);
    const event = await this.prisma.event.findFirst({
      where: { id: detail.eventId },
      select: { startDate: true, endDate: true, status: true, tenant: { select: { slug: true } } },
    });
    if (!event || event.tenant?.slug !== BCH_VENUE_SLUG) {
      throw new NotFoundException('Pedido não encontrado.');
    }
    const tokenRow = await this.prisma.eventTicketOrder.findFirst({
      where: { id: detail.id },
      select: { publicAccessToken: true },
    });
    const token = tokenRow?.publicAccessToken;
    if (!token || token !== publicAccessToken.trim()) {
      throw new NotFoundException('Pedido não encontrado.');
    }
    return await this.toPublicOrder(detail, token, {
      startDate: event.startDate,
      endDate: event.endDate,
    });
  }
}
