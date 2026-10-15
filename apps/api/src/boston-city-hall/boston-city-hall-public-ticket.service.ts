import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { renderTicketCode128Png } from './boston-city-hall-ticket-barcode.util';
import { PrismaService } from '../prisma/prisma.service';
import { BCH_VENUE_SLUG } from './boston-city-hall.constants';
import { generatePublicTicketRef } from './boston-city-hall-ticket-credential.util';
import {
  type BchPublicTicketDto,
  bchPublicTicketQrPath,
  mapTicketToPublicStatusLabel,
} from './boston-city-hall-public-tickets.constants';
import { bchPublicDetailPath } from './boston-city-hall-public-events.constants';

type TicketRow = {
  id: string;
  publicTicketRef: string | null;
  ticketCode: string;
  qrToken: string;
  status: string;
  ticketTypeName: string;
  lotName: string | null;
  holderName: string;
  issuedAt: Date;
  admissionSource: string;
  orderId: string | null;
  table: { name: string; section: string | null } | null;
  seat: { seatLabel: string; section: string | null; rowLabel: string | null } | null;
};

@Injectable()
export class BostonCityHallPublicTicketService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveTenantId(): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: BCH_VENUE_SLUG },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException('Venue não encontrado.');
    return tenant.id;
  }

  async ensurePublicTicketRef(ticketId: string, tenantId: string): Promise<string> {
    const row = await this.prisma.eventTicket.findFirst({
      where: { id: ticketId, tenantId },
      select: { publicTicketRef: true },
    });
    if (!row) throw new NotFoundException('Ingresso não encontrado.');
    if (row.publicTicketRef?.trim()) return row.publicTicketRef.trim();

    for (let attempt = 0; attempt < 8; attempt++) {
      const ref = generatePublicTicketRef();
      try {
        const updated = await this.prisma.eventTicket.updateMany({
          where: { id: ticketId, tenantId, publicTicketRef: null },
          data: { publicTicketRef: ref },
        });
        if (updated.count > 0) return ref;
        const again = await this.prisma.eventTicket.findFirst({
          where: { id: ticketId, tenantId },
          select: { publicTicketRef: true },
        });
        if (again?.publicTicketRef) return again.publicTicketRef;
      } catch {
        /* colisão unique — retry */
      }
    }
    throw new NotFoundException('Não foi possível preparar referência pública do ingresso.');
  }

  private serializeTicket(row: TicketRow, orderPublicToken: string): BchPublicTicketDto {
    const ref = row.publicTicketRef?.trim();
    if (!ref) {
      throw new NotFoundException('Ingresso sem referência pública.');
    }
    const section =
      row.seat?.section?.trim() ||
      row.table?.section?.trim() ||
      row.seat?.rowLabel?.trim() ||
      null;
    const hasSeating = Boolean(row.table?.name || row.seat?.seatLabel || section);
    return {
      publicTicketRef: ref,
      ticketCode: row.ticketCode,
      ticketTypeName: row.ticketTypeName,
      lotName: row.lotName,
      holderName: row.holderName,
      status: mapTicketToPublicStatusLabel(row.status),
      issuedAt: row.issuedAt.toISOString(),
      seating: hasSeating
        ? {
            tableName: row.table?.name ?? null,
            seatLabel: row.seat?.seatLabel ?? null,
            section,
          }
        : null,
      qrPath: bchPublicTicketQrPath(orderPublicToken, ref),
    };
  }

  private ticketInclude() {
    return {
      table: { select: { name: true, section: true } },
      seat: { select: { seatLabel: true, section: true, rowLabel: true } },
    } as const;
  }

  async listPublicTicketsForConfirmedOrder(
    orderPublicToken: string,
  ): Promise<{ tickets: BchPublicTicketDto[]; ticketCount: number }> {
    const tenantId = await this.resolveTenantId();
    const order = await this.prisma.eventTicketOrder.findFirst({
      where: { tenantId, publicAccessToken: orderPublicToken.trim() },
      select: { id: true, status: true },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    if (order.status !== 'confirmed') {
      return { tickets: [], ticketCount: 0 };
    }

    const rows = await this.prisma.eventTicket.findMany({
      where: {
        tenantId,
        orderId: order.id,
        admissionSource: 'paid_order',
      },
      orderBy: [{ orderItemId: 'asc' }, { lineIndex: 'asc' }],
      include: this.ticketInclude(),
    });

    const tickets: BchPublicTicketDto[] = [];
    for (const row of rows) {
      if (!row.publicTicketRef) {
        await this.ensurePublicTicketRef(row.id, tenantId);
        const refreshed = await this.prisma.eventTicket.findFirst({
          where: { id: row.id, tenantId },
          include: this.ticketInclude(),
        });
        if (refreshed) tickets.push(this.serializeTicket(refreshed, orderPublicToken));
      } else {
        tickets.push(this.serializeTicket(row, orderPublicToken));
      }
    }
    return { tickets, ticketCount: tickets.length };
  }

  async assertOrderOwnsTicket(
    orderPublicToken: string,
    publicTicketRef: string,
  ): Promise<{ tenantId: string; ticketCode: string }> {
    const tenantId = await this.resolveTenantId();
    const order = await this.prisma.eventTicketOrder.findFirst({
      where: { tenantId, publicAccessToken: orderPublicToken.trim() },
      select: { id: true, status: true },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    if (order.status !== 'confirmed') {
      throw new ForbiddenException('Ingressos ainda não disponíveis para este pedido.');
    }

    const ticket = await this.prisma.eventTicket.findFirst({
      where: {
        tenantId,
        orderId: order.id,
        publicTicketRef: publicTicketRef.trim(),
        admissionSource: 'paid_order',
      },
      select: { ticketCode: true },
    });
    if (!ticket) throw new NotFoundException('Ingresso não encontrado.');
    return { tenantId, ticketCode: ticket.ticketCode };
  }

  async renderQrPngForOrderTicket(orderPublicToken: string, publicTicketRef: string): Promise<Buffer> {
    const { ticketCode } = await this.assertOrderOwnsTicket(orderPublicToken, publicTicketRef);
    return renderTicketCode128Png(ticketCode);
  }

  async buildEventDtoForOrder(eventId: string): Promise<{
    slug: string;
    name: string;
    startDate: string | null;
    endDate: string | null;
    detailPath: string;
  }> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId },
      select: { slug: true, name: true, startDate: true, endDate: true },
    });
    if (!event) throw new NotFoundException('Evento não encontrado.');
    return {
      slug: event.slug,
      name: event.name,
      startDate: event.startDate?.toISOString() ?? null,
      endDate: event.endDate?.toISOString() ?? null,
      detailPath: bchPublicDetailPath(event.slug),
    };
  }
}
