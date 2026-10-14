import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BostonCityHallOperationsService } from './boston-city-hall-operations.service';
import {
  type BchEventWorkspaceDto,
  type BchEventWorkspaceReadinessItemDto,
} from './boston-city-hall-event-workspace.constants';
import { deriveSalesStatus } from './boston-city-hall-ticketing.availability';

function locationFromContent(content: unknown): string | null {
  if (!content || typeof content !== 'object') return null;
  const c = content as Record<string, unknown>;
  const loc = c.locationLabel ?? c.location ?? c.venue;
  return typeof loc === 'string' && loc.trim() ? loc.trim() : null;
}

function dateOnly(iso: Date | null): string | null {
  return iso ? iso.toISOString().slice(0, 10) : null;
}

@Injectable()
export class BostonCityHallEventWorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operations: BostonCityHallOperationsService,
  ) {}

  async getWorkspace(tenantId: string, eventId: string): Promise<BchEventWorkspaceDto> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId.trim(), tenantId },
      include: {
        ticketing: true,
        tenant: { select: { name: true } },
      },
    });
    if (!event) throw new NotFoundException('Evento não encontrado.');

    const booking = await this.operations.getOperationListItemByEventId(eventId.trim());

    const ticketingEnabled = event.ticketing?.enabled ?? false;
    const types = ticketingEnabled
      ? await this.prisma.eventTicketType.findMany({
          where: { tenantId, eventId: event.id, active: true },
          select: {
            id: true,
            salesStartAt: true,
            salesEndAt: true,
            quantity: true,
          },
        })
      : [];

    const salesOpen =
      types.length > 0 &&
      types.some((t) =>
        deriveSalesStatus({
          active: true,
          salesStartAt: t.salesStartAt,
          salesEndAt: t.salesEndAt,
          available: t.quantity ?? 9999,
        }) === 'on_sale',
      );

    const ticketKpis = await this.loadTicketKpis(tenantId, event.id, ticketingEnabled, event.ticketing?.currency ?? null);

    const readiness = this.buildReadiness({
      eventStart: event.startDate,
      eventStatus: event.status,
      booking,
      ticketingEnabled,
      typesCount: types.length,
      salesOpen,
      capacityIssue: false,
    });

    const operationalStage = this.deriveStage(event.startDate, event.endDate, booking);

    const alertOpenCount = await this.prisma.bchOperationalAlert.count({
      where: { tenantId, eventId: event.id, status: 'open' },
    });

    return {
      event: {
        id: event.id,
        slug: event.slug,
        name: event.name,
        description: event.description,
        status: event.status,
        organizer: event.organizer,
        category: event.category,
        logoUrl: event.logoUrl,
        startAt: event.startDate?.toISOString() ?? null,
        endAt: event.endDate?.toISOString() ?? null,
        startDate: dateOnly(event.startDate),
        endDate: dateOnly(event.endDate),
        locationLabel: locationFromContent(event.content) ?? booking?.spaceName ?? null,
        content: event.content,
      },
      booking,
      ticketing: {
        enabled: ticketingEnabled,
        currency: event.ticketing?.currency ?? ticketKpis.currency,
        typesActiveCount: types.length,
        salesOpen,
      },
      ticketKpis,
      readiness,
      operationalStage,
      alertOpenCount,
    };
  }

  private async loadTicketKpis(
    tenantId: string,
    eventId: string,
    enabled: boolean,
    currencyHint: string | null,
  ) {
    if (!enabled) {
      return {
        applicable: false,
        enabled: false,
        currency: currencyHint,
        ticketsSold: 0,
        capacityConfigured: null,
        checkedIn: 0,
        grossAmount: null,
      } satisfies BchEventWorkspaceDto['ticketKpis'];
    }

    const [itemAgg, orderAgg, currencyRow, checkedInCount, capacityAgg] = await Promise.all([
      this.prisma.eventTicketOrderItem.aggregate({
        where: { order: { tenantId, eventId, status: 'confirmed' } },
        _sum: { quantity: true },
      }),
      this.prisma.eventTicketOrder.aggregate({
        where: { tenantId, eventId, status: 'confirmed' },
        _sum: { total: true },
      }),
      this.prisma.eventTicketOrder.findFirst({
        where: { tenantId, eventId, status: 'confirmed' },
        select: { currency: true },
        orderBy: { confirmedAt: 'desc' },
      }),
      this.prisma.eventTicket.count({
        where: { tenantId, eventId, status: 'used' },
      }),
      this.prisma.eventTicketType.aggregate({
        where: { tenantId, eventId, active: true },
        _sum: { quantity: true },
      }),
    ]);

    const gross = orderAgg._sum.total;
    const grossAmount =
      gross instanceof Prisma.Decimal ? gross.toFixed(2) : gross != null ? String(gross) : null;

    return {
      applicable: true,
      enabled: true,
      currency: currencyRow?.currency ?? currencyHint ?? 'USD',
      ticketsSold: itemAgg._sum.quantity ?? 0,
      capacityConfigured: capacityAgg._sum.quantity ?? null,
      checkedIn: checkedInCount,
      grossAmount,
    };
  }

  private buildReadiness(input: {
    eventStart: Date | null;
    eventStatus: string;
    booking: BchEventWorkspaceDto['booking'];
    ticketingEnabled: boolean;
    typesCount: number;
    salesOpen: boolean;
    capacityIssue: boolean;
  }): BchEventWorkspaceReadinessItemDto[] {
    const items: BchEventWorkspaceReadinessItemDto[] = [];

    items.push({
      code: 'schedule',
      ok: Boolean(input.eventStart),
      label: input.eventStart ? 'Data e horário definidos' : 'Data do evento pendente',
    });

    items.push({
      code: 'booking',
      ok: Boolean(input.booking && input.booking.bookingStatus !== 'cancelled'),
      label: input.booking
        ? input.booking.bookingStatus === 'cancelled'
          ? 'Reserva cancelada'
          : 'Reserva vinculada'
        : 'Sem reserva vinculada',
      detail: input.booking?.spaceName ?? null,
    });

    if (input.booking?.contract) {
      items.push({
        code: 'contract',
        ok: input.booking.contract.status === 'signed',
        label:
          input.booking.contract.status === 'signed'
            ? 'Contrato assinado'
            : 'Contrato pendente de assinatura',
      });
    } else {
      items.push({
        code: 'contract',
        ok: false,
        label: 'Sem contrato',
      });
    }

    if (input.ticketingEnabled) {
      const ok =
        input.typesCount > 0 && !input.capacityIssue && (input.salesOpen || input.typesCount > 0);
      items.push({
        code: 'ticketing',
        ok,
        label: ok ? 'Bilheteria configurada' : 'Bilheteria incompleta',
        detail: input.salesOpen ? 'Vendas abertas' : 'Vendas não abertas',
      });
    } else {
      items.push({
        code: 'ticketing',
        ok: true,
        label: 'Bilheteria não aplicável',
        detail: 'Evento privado ou sem venda de ingressos',
      });
    }

    items.push({
      code: 'publication',
      ok: input.eventStatus === 'published',
      label: input.eventStatus === 'published' ? 'Evento publicado' : 'Rascunho / não publicado',
    });

    return items;
  }

  private deriveStage(
    start: Date | null,
    end: Date | null,
    booking: BchEventWorkspaceDto['booking'],
  ): BchEventWorkspaceDto['operationalStage'] {
    const now = Date.now();
    if (start && end && now >= start.getTime() && now <= end.getTime()) {
      return 'execucao';
    }
    if (end && now > end.getTime()) {
      return 'fechamento';
    }
    if (booking?.contract?.status === 'signed' || booking?.finance) {
      return 'preparacao';
    }
    return 'planejamento';
  }
}
