import { Injectable, NotFoundException } from '@nestjs/common';
import type { EventTicket } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BCH_VENUE_SLUG } from './boston-city-hall.constants';
import {
  type EventTicketCheckinRecentItemDto,
  type EventTicketCheckinResponseDto,
  type EventTicketCheckinResult,
} from './boston-city-hall-ticket-checkin.constants';
import {
  classifyCheckinInput,
  credentialFingerprint,
  resolveCheckinResultForTicket,
} from './boston-city-hall-ticket-checkin.util';

type TicketRow = EventTicket & {
  table?: { name: string; section: string | null } | null;
  seat?: { seatLabel: string; section: string | null } | null;
};

const TICKET_SEATING_INCLUDE = { table: true, seat: true } as const;

@Injectable()
export class BostonCityHallTicketCheckinService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveTenantId(venueSlug = BCH_VENUE_SLUG): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: venueSlug },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException(`Tenant "${venueSlug}" não encontrado.`);
    return tenant.id;
  }

  private ticketSnapshot(ticket: TicketRow | null) {
    if (!ticket) return null;
    return {
      id: ticket.id,
      ticketCode: ticket.ticketCode,
      ticketTypeName: ticket.ticketTypeName,
      lotName: ticket.lotName,
      holderName: ticket.holderName,
      status: ticket.status,
      usedAt: ticket.usedAt?.toISOString() ?? null,
      admissionSource: ticket.admissionSource,
      tableName: ticket.table?.name ?? null,
      seatLabel: ticket.seat?.seatLabel ?? null,
      section: ticket.seat?.section ?? ticket.table?.section ?? null,
    };
  }

  private async persistCheckin(data: {
    tenantId: string;
    eventId: string;
    ticket: TicketRow | null;
    result: EventTicketCheckinResult;
    operatorUserId: string | null;
    stationLabel?: string | null;
    credentialFingerprint: string;
  }): Promise<EventTicketCheckinResponseDto> {
    const row = await this.prisma.eventTicketCheckin.create({
      data: {
        tenantId: data.tenantId,
        eventId: data.eventId,
        ticketId: data.ticket?.id ?? null,
        operatorUserId: data.operatorUserId,
        result: data.result,
        stationLabel: data.stationLabel?.trim() || null,
        credentialFingerprint: data.credentialFingerprint || null,
        ticketCode: data.ticket?.ticketCode ?? null,
        ticketTypeName: data.ticket?.ticketTypeName ?? null,
        holderName: data.ticket?.holderName ?? null,
      },
    });
    return {
      result: data.result,
      checkinId: row.id,
      scannedAt: row.createdAt.toISOString(),
      ticket: this.ticketSnapshot(data.ticket),
    };
  }

  async performCheckinForVenue(input: {
    eventId: string;
    scanInput: string;
    operatorUserId: string | null;
    stationLabel?: string | null;
  }): Promise<EventTicketCheckinResponseDto> {
    const tenantId = await this.resolveTenantId();
    return this.performCheckin({ tenantId, ...input });
  }

  async performCheckin(input: {
    tenantId: string;
    eventId: string;
    scanInput: string;
    operatorUserId: string | null;
    stationLabel?: string | null;
  }): Promise<EventTicketCheckinResponseDto> {
    const event = await this.prisma.event.findFirst({
      where: { id: input.eventId, tenantId: input.tenantId },
      select: { id: true },
    });
    if (!event) throw new NotFoundException('Evento não encontrado.');

    const fingerprint = credentialFingerprint(input.scanInput);
    const classified = classifyCheckinInput(input.scanInput);

    if (classified.kind === 'empty' || classified.kind === 'reject_id') {
      return this.persistCheckin({
        tenantId: input.tenantId,
        eventId: input.eventId,
        ticket: null,
        result: 'invalid',
        operatorUserId: input.operatorUserId,
        stationLabel: input.stationLabel,
        credentialFingerprint: fingerprint,
      });
    }

    let ticket: TicketRow | null = null;
    if (classified.kind === 'token') {
      ticket = await this.prisma.eventTicket.findFirst({
        where: { tenantId: input.tenantId, qrToken: classified.token },
        include: TICKET_SEATING_INCLUDE,
      });
    } else {
      ticket = await this.prisma.eventTicket.findFirst({
        where: {
          tenantId: input.tenantId,
          ticketCode: { equals: classified.code, mode: 'insensitive' },
        },
        include: TICKET_SEATING_INCLUDE,
      });
    }

    if (!ticket) {
      return this.persistCheckin({
        tenantId: input.tenantId,
        eventId: input.eventId,
        ticket: null,
        result: 'invalid',
        operatorUserId: input.operatorUserId,
        stationLabel: input.stationLabel,
        credentialFingerprint: fingerprint,
      });
    }

    const preliminary = resolveCheckinResultForTicket({
      ticketStatus: ticket.status,
      ticketEventId: ticket.eventId,
      selectedEventId: input.eventId,
    });

    if (preliminary === 'wrong_event') {
      return this.persistCheckin({
        tenantId: input.tenantId,
        eventId: input.eventId,
        ticket,
        result: 'wrong_event',
        operatorUserId: input.operatorUserId,
        stationLabel: input.stationLabel,
        credentialFingerprint: fingerprint,
      });
    }

    if (preliminary === 'cancelled') {
      return this.persistCheckin({
        tenantId: input.tenantId,
        eventId: input.eventId,
        ticket,
        result: 'cancelled',
        operatorUserId: input.operatorUserId,
        stationLabel: input.stationLabel,
        credentialFingerprint: fingerprint,
      });
    }

    if (preliminary === 'already_used') {
      return this.persistCheckin({
        tenantId: input.tenantId,
        eventId: input.eventId,
        ticket,
        result: 'already_used',
        operatorUserId: input.operatorUserId,
        stationLabel: input.stationLabel,
        credentialFingerprint: fingerprint,
      });
    }

    if (preliminary !== 'accepted') {
      return this.persistCheckin({
        tenantId: input.tenantId,
        eventId: input.eventId,
        ticket,
        result: 'invalid',
        operatorUserId: input.operatorUserId,
        stationLabel: input.stationLabel,
        credentialFingerprint: fingerprint,
      });
    }

    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.eventTicket.updateMany({
        where: {
          id: ticket!.id,
          tenantId: input.tenantId,
          status: 'valid',
        },
        data: {
          status: 'used',
          usedAt: now,
        },
      });

      if (updated.count === 0) {
        const fresh = await tx.eventTicket.findUnique({
          where: { id: ticket!.id },
          include: TICKET_SEATING_INCLUDE,
        });
        const result: EventTicketCheckinResult =
          fresh?.status === 'used'
            ? 'already_used'
            : fresh?.status === 'cancelled'
              ? 'cancelled'
              : fresh && fresh.eventId !== input.eventId
                ? 'wrong_event'
                : 'invalid';

        const row = await tx.eventTicketCheckin.create({
          data: {
            tenantId: input.tenantId,
            eventId: input.eventId,
            ticketId: fresh?.id ?? ticket!.id,
            operatorUserId: input.operatorUserId,
            result,
            stationLabel: input.stationLabel?.trim() || null,
            credentialFingerprint: fingerprint,
            ticketCode: fresh?.ticketCode ?? ticket!.ticketCode,
            ticketTypeName: fresh?.ticketTypeName ?? ticket!.ticketTypeName,
            holderName: fresh?.holderName ?? ticket!.holderName,
          },
        });

        return {
          result,
          checkinId: row.id,
          scannedAt: row.createdAt.toISOString(),
          ticket: this.ticketSnapshot(fresh ?? ticket),
        };
      }

      const usedTicket = await tx.eventTicket.findUnique({
        where: { id: ticket!.id },
        include: TICKET_SEATING_INCLUDE,
      });
      const row = await tx.eventTicketCheckin.create({
        data: {
          tenantId: input.tenantId,
          eventId: input.eventId,
          ticketId: ticket!.id,
          operatorUserId: input.operatorUserId,
          result: 'accepted',
          stationLabel: input.stationLabel?.trim() || null,
          credentialFingerprint: fingerprint,
          ticketCode: ticket!.ticketCode,
          ticketTypeName: ticket!.ticketTypeName,
          holderName: ticket!.holderName,
        },
      });

      return {
        result: 'accepted' as const,
        checkinId: row.id,
        scannedAt: row.createdAt.toISOString(),
        ticket: this.ticketSnapshot(usedTicket ?? ticket),
      };
    });
  }

  async listRecentForVenue(eventId: string, limit = 40): Promise<EventTicketCheckinRecentItemDto[]> {
    const tenantId = await this.resolveTenantId();
    const take = Math.min(Math.max(limit, 1), 100);
    const rows = await this.prisma.eventTicketCheckin.findMany({
      where: { tenantId, eventId },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return rows.map((r) => ({
      id: r.id,
      result: r.result as EventTicketCheckinResult,
      ticketCode: r.ticketCode,
      ticketTypeName: r.ticketTypeName,
      holderName: r.holderName,
      stationLabel: r.stationLabel,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
