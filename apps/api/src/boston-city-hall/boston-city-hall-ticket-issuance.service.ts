import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { BCH_VENUE_SLUG } from './boston-city-hall.constants';
import type { ConfirmTicketOrderFromPaymentResult } from './boston-city-hall-ticket-payment.service';
import {
  type EventTicketLookupDto,
  type EventTicketStatus,
  type EventTicketSummaryDto,
  EVENT_TICKET_STATUSES,
} from './boston-city-hall-event-ticket.constants';
import {
  buildCup360TicketQrPayload,
  parseCup360TicketQrCredential,
} from './boston-city-hall-ticket-credential.util';
import {
  expectedTicketCountForItems,
  lineIndexesToIssue,
  shouldIssueTicketsForOrder,
} from './boston-city-hall-ticket-issuance';
import {
  createEventTicketInTx,
  orderItemIssuanceKey,
} from './boston-city-hall-event-ticket-issue.util';

function moneyToString(value: Prisma.Decimal | number): string {
  if (value instanceof Prisma.Decimal) return value.toFixed(2);
  return new Prisma.Decimal(value).toFixed(2);
}

function normalizeStatus(raw: string): EventTicketStatus {
  if ((EVENT_TICKET_STATUSES as readonly string[]).includes(raw)) {
    return raw as EventTicketStatus;
  }
  return 'valid';
}

@Injectable()
export class BostonCityHallTicketIssuanceService {
  private readonly logger = new Logger(BostonCityHallTicketIssuanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async resolveTenantId(venueSlug = BCH_VENUE_SLUG): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: venueSlug },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException(`Tenant "${venueSlug}" não encontrado.`);
    return tenant.id;
  }

  private serialize(row: {
    id: string;
    ticketCode: string;
    qrToken: string;
    status: string;
    ticketTypeName: string;
    lotName: string | null;
    holderName: string;
    unitPrice: Prisma.Decimal;
    currency: string;
    issuedAt: Date;
  }): EventTicketSummaryDto {
    return {
      id: row.id,
      ticketCode: row.ticketCode,
      qrPayload: buildCup360TicketQrPayload(row.qrToken),
      status: normalizeStatus(row.status),
      ticketTypeName: row.ticketTypeName,
      lotName: row.lotName,
      holderName: row.holderName,
      unitPrice: moneyToString(row.unitPrice),
      currency: row.currency,
      issuedAt: row.issuedAt.toISOString(),
    };
  }

  async listTicketsForOrder(tenantId: string, orderId: string): Promise<EventTicketSummaryDto[]> {
    const rows = await this.prisma.eventTicket.findMany({
      where: { tenantId, orderId },
      orderBy: [{ orderItemId: 'asc' }, { lineIndex: 'asc' }],
    });
    return rows.map((r) => this.serialize(r));
  }

  async ensureTicketsForOrder(
    orderId: string,
    tenantId: string,
  ): Promise<{ tickets: EventTicketSummaryDto[]; created: number; error?: string }> {
    const order = await this.prisma.eventTicketOrder.findFirst({
      where: { id: orderId, tenantId },
      include: {
        items: true,
        event: { select: { name: true } },
      },
    });
    if (!order) {
      return { tickets: [], created: 0, error: 'Pedido não encontrado.' };
    }

    const payment = await this.prisma.payment.findUnique({
      where: { eventTicketOrderId: orderId },
    });

    if (
      !shouldIssueTicketsForOrder({
        orderStatus: order.status,
        paymentStatus: payment?.status,
        reconciliationRequired: false,
      })
    ) {
      const existing = await this.listTicketsForOrder(tenantId, orderId);
      return { tickets: existing, created: 0 };
    }

    let created = 0;
    const issuedAt = order.confirmedAt ?? payment?.paidAt ?? new Date();

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          const existingCount = await tx.eventTicket.count({
            where: { orderItemId: item.id },
          });
          const indexes = lineIndexesToIssue(item.quantity, existingCount);
          for (const lineIndex of indexes) {
            const outcome = await createEventTicketInTx(tx, {
              tenantId,
              eventId: order.eventId,
              issuanceKey: orderItemIssuanceKey(item.id, lineIndex),
              admissionSource: 'paid_order',
              orderId: order.id,
              orderItemId: item.id,
              ticketTypeId: item.ticketTypeId,
              ticketLotId: item.ticketLotId,
              lineIndex,
              orderNumber: order.orderNumber,
              ticketTypeName: item.ticketTypeName,
              lotName: item.lotName,
              unitPrice: item.unitPrice,
              currency: order.currency,
              eventName: order.event.name,
              holderName: order.customerName,
              holderEmail: order.customerEmail,
              issuedAt,
            });
            if (outcome === 'created') created += 1;
          }
        }
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Falha ao emitir ingressos do pedido ${order.orderNumber} (${orderId}): ${msg}`);
      const partial = await this.listTicketsForOrder(tenantId, orderId);
      return { tickets: partial, created, error: msg };
    }

    const tickets = await this.listTicketsForOrder(tenantId, orderId);
    const expected = expectedTicketCountForItems(order.items);
    if (tickets.length !== expected) {
      this.logger.warn(
        `Pedido ${order.orderNumber}: esperado ${expected} ingressos, encontrado ${tickets.length}.`,
      );
    }
    return { tickets, created };
  }

  async afterOrderConfirmation(
    confirmation: ConfirmTicketOrderFromPaymentResult,
    tenantId: string,
  ): Promise<{ tickets: EventTicketSummaryDto[]; created: number; error?: string }> {
    if (confirmation.reconciliationRequired) {
      return { tickets: [], created: 0 };
    }
    if (
      confirmation.outcome !== 'confirmed' &&
      confirmation.outcome !== 'already_confirmed'
    ) {
      return { tickets: [], created: 0 };
    }
    return this.ensureTicketsForOrder(confirmation.orderId, tenantId);
  }

  async lookupByCode(tenantId: string, ticketCode: string): Promise<EventTicketLookupDto> {
    const code = ticketCode.trim().toUpperCase();
    const row = await this.prisma.eventTicket.findFirst({
      where: { tenantId, ticketCode: { equals: code, mode: 'insensitive' } },
    });
    if (!row) throw new NotFoundException('Ingresso não encontrado.');
    return this.toLookup(row);
  }

  async lookupByCredential(tenantId: string, credential: string): Promise<EventTicketLookupDto> {
    const token = parseCup360TicketQrCredential(credential);
    if (!token) throw new NotFoundException('Credencial QR inválida.');
    const row = await this.prisma.eventTicket.findFirst({
      where: { tenantId, qrToken: token },
    });
    if (!row) throw new NotFoundException('Ingresso não encontrado.');
    return this.toLookup(row);
  }

  private toLookup(row: {
    id: string;
    ticketCode: string;
    status: string;
    orderNumber: string;
    eventName: string;
    ticketTypeName: string;
    lotName: string | null;
    holderName: string;
    issuedAt: Date;
  }): EventTicketLookupDto {
    return {
      id: row.id,
      ticketCode: row.ticketCode,
      status: normalizeStatus(row.status),
      orderNumber: row.orderNumber,
      eventName: row.eventName,
      ticketTypeName: row.ticketTypeName,
      lotName: row.lotName,
      holderName: row.holderName,
      issuedAt: row.issuedAt.toISOString(),
    };
  }

  async lookupByCodeForVenue(ticketCode: string) {
    const tenantId = await this.resolveTenantId();
    return this.lookupByCode(tenantId, ticketCode);
  }

  async lookupByCredentialForVenue(credential: string) {
    const tenantId = await this.resolveTenantId();
    return this.lookupByCredential(tenantId, credential);
  }

  async renderQrPngForVenue(ticketId: string): Promise<Buffer> {
    const tenantId = await this.resolveTenantId();
    return this.renderQrPng(tenantId, ticketId);
  }

  async renderQrPng(tenantId: string, ticketId: string): Promise<Buffer> {
    const row = await this.prisma.eventTicket.findFirst({
      where: { id: ticketId, tenantId },
    });
    if (!row) throw new NotFoundException('Ingresso não encontrado.');
    const payload = buildCup360TicketQrPayload(row.qrToken);
    return QRCode.toBuffer(payload, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 280,
    });
  }
}
