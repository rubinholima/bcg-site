import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BCH_VENUE_SLUG } from './boston-city-hall.constants';
import { validateSeatAssignment } from './boston-city-hall-seating.util';

@Injectable()
export class BostonCityHallSeatingService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveTenantId(venueSlug = BCH_VENUE_SLUG): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: venueSlug },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException(`Tenant "${venueSlug}" não encontrado.`);
    return tenant.id;
  }

  async listTablesForVenue(eventId: string) {
    const tenantId = await this.resolveTenantId();
    return this.prisma.eventTicketTable.findMany({
      where: { tenantId, eventId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { seats: true } } },
    });
  }

  async createTableForVenue(
    eventId: string,
    body: { name: string; capacity: number; section?: string; notes?: string; sortOrder?: number },
  ) {
    const tenantId = await this.resolveTenantId();
    const name = body.name.trim();
    if (!name) throw new BadRequestException('Nome da mesa é obrigatório.');
    const capacity = Math.floor(Number(body.capacity));
    if (!Number.isFinite(capacity) || capacity < 1) {
      throw new BadRequestException('Capacidade inválida.');
    }
    return this.prisma.eventTicketTable.create({
      data: {
        tenantId,
        eventId,
        name,
        capacity,
        section: body.section?.trim() || null,
        notes: body.notes?.trim() || null,
        sortOrder: body.sortOrder ?? 0,
      },
    });
  }

  async updateTableForVenue(
    id: string,
    body: Partial<{ name: string; capacity: number; section: string | null; active: boolean; notes: string | null; sortOrder: number }>,
  ) {
    const tenantId = await this.resolveTenantId();
    const row = await this.prisma.eventTicketTable.findFirst({ where: { id, tenantId } });
    if (!row) throw new NotFoundException('Mesa não encontrada.');
    return this.prisma.eventTicketTable.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.capacity !== undefined ? { capacity: Math.floor(Number(body.capacity)) } : {}),
        ...(body.section !== undefined ? { section: body.section?.trim() || null } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
        ...(body.notes !== undefined ? { notes: body.notes?.trim() || null } : {}),
        ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      },
    });
  }

  async listSeatsForVenue(eventId: string, tableId?: string) {
    const tenantId = await this.resolveTenantId();
    return this.prisma.eventTicketSeat.findMany({
      where: {
        tenantId,
        eventId,
        ...(tableId ? { tableId } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { seatLabel: 'asc' }],
      include: { table: { select: { name: true } } },
    });
  }

  async createSeatForVenue(
    eventId: string,
    body: {
      seatLabel: string;
      tableId?: string | null;
      section?: string;
      rowLabel?: string;
      sortOrder?: number;
    },
  ) {
    const tenantId = await this.resolveTenantId();
    const seatLabel = body.seatLabel.trim();
    if (!seatLabel) throw new BadRequestException('Identificação do assento é obrigatória.');
    if (body.tableId) {
      const table = await this.prisma.eventTicketTable.findFirst({
        where: { id: body.tableId, tenantId, eventId },
      });
      if (!table) throw new BadRequestException('Mesa inválida para este evento.');
    }
    return this.prisma.eventTicketSeat.create({
      data: {
        tenantId,
        eventId,
        tableId: body.tableId ?? null,
        seatLabel,
        section: body.section?.trim() || null,
        rowLabel: body.rowLabel?.trim() || null,
        sortOrder: body.sortOrder ?? 0,
      },
    });
  }

  async assignTicketSeatingForVenue(
    ticketId: string,
    body: { tableId?: string | null; seatId?: string | null },
  ) {
    const tenantId = await this.resolveTenantId();
    const ticket = await this.prisma.eventTicket.findFirst({
      where: { id: ticketId, tenantId },
    });
    if (!ticket) throw new NotFoundException('Ingresso não encontrado.');
    if (ticket.status === 'used') {
      throw new BadRequestException('Ingresso já utilizado — assento não pode ser alterado.');
    }
    if (ticket.status === 'cancelled') {
      throw new BadRequestException('Ingresso cancelado.');
    }

    const tableId = body.tableId ?? null;
    const seatId = body.seatId ?? null;

    let table = null as { id: string; eventId: string; name: string } | null;
    let seat = null as {
      id: string;
      eventId: string;
      tableId: string | null;
      seatLabel: string;
      section: string | null;
    } | null;

    if (tableId) {
      table = await this.prisma.eventTicketTable.findFirst({
        where: { id: tableId, tenantId, eventId: ticket.eventId },
      });
      if (!table) throw new BadRequestException('Mesa inválida para este evento.');
    }
    if (seatId) {
      seat = await this.prisma.eventTicketSeat.findFirst({
        where: { id: seatId, tenantId, eventId: ticket.eventId },
      });
      if (!seat) throw new BadRequestException('Assento inválido para este evento.');
      const check = validateSeatAssignment({
        ticketEventId: ticket.eventId,
        tableEventId: table?.eventId,
        seatEventId: seat.eventId,
        seatTableId: seat.tableId,
        targetTableId: tableId ?? seat.tableId,
      });
      if (!check.ok) throw new BadRequestException(check.reason);

      const taken = await this.prisma.eventTicket.findFirst({
        where: {
          seatId,
          status: { in: ['valid', 'used'] },
          NOT: { id: ticketId },
        },
      });
      if (taken) throw new BadRequestException('Assento já alocado a outro ingresso ativo.');
    }

    if (!seatId && tableId) {
      const check = validateSeatAssignment({
        ticketEventId: ticket.eventId,
        tableEventId: table!.eventId,
        seatEventId: null,
        seatTableId: null,
        targetTableId: tableId,
      });
      if (!check.ok) throw new BadRequestException(check.reason);
    }

    const updated = await this.prisma.eventTicket.update({
      where: { id: ticketId },
      data: {
        tableId: seatId ? seat!.tableId ?? tableId : tableId,
        seatId,
      },
      include: { table: true, seat: true },
    });

    return {
      id: updated.id,
      ticketCode: updated.ticketCode,
      tableId: updated.tableId,
      tableName: updated.table?.name ?? null,
      seatId: updated.seatId,
      seatLabel: updated.seat?.seatLabel ?? null,
      section: updated.seat?.section ?? updated.table?.section ?? null,
    };
  }

  async clearTicketSeatingForVenue(ticketId: string) {
    return this.assignTicketSeatingForVenue(ticketId, { tableId: null, seatId: null });
  }
}
