import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BCH_VENUE_SLUG } from './boston-city-hall.constants';
import {
  COMPLIMENTARY_REASONS,
  type ComplimentaryReason,
} from './boston-city-hall-complimentary.constants';
import {
  complimentaryIssuanceKey,
  createEventTicketInTx,
} from './boston-city-hall-event-ticket-issue.util';
import { lineIndexesToIssue } from './boston-city-hall-ticket-issuance';
import { BostonCityHallTicketInventoryService } from './boston-city-hall-ticket-inventory.service';
import { resolveTypeAvailability, type InventoryCounters } from './boston-city-hall-ticketing.availability';
import { buildCup360TicketQrPayload } from './boston-city-hall-ticket-credential.util';

function moneyToString(value: Prisma.Decimal | number): string {
  if (value instanceof Prisma.Decimal) return value.toFixed(2);
  return new Prisma.Decimal(value).toFixed(2);
}

@Injectable()
export class BostonCityHallComplimentaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: BostonCityHallTicketInventoryService,
  ) {}

  private async resolveTenantId(venueSlug = BCH_VENUE_SLUG): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: venueSlug },
      select: { id: true },
    });
    if (!tenant) throw new NotFoundException(`Tenant "${venueSlug}" não encontrado.`);
    return tenant.id;
  }

  private normalizeReason(raw: string): ComplimentaryReason {
    const r = raw.trim().toLowerCase();
    if ((COMPLIMENTARY_REASONS as readonly string[]).includes(r)) return r as ComplimentaryReason;
    throw new BadRequestException('Motivo de cortesia inválido.');
  }

  async createAndIssueForVenue(
    input: {
      eventId: string;
      ticketTypeId: string;
      ticketLotId?: string | null;
      guestName: string;
      guestEmail?: string;
      guestPhone?: string;
      quantity: number;
      reason: string;
      notes?: string;
    },
    createdByUserId: string | null,
  ) {
    const tenantId = await this.resolveTenantId();
    const qty = Math.floor(Number(input.quantity));
    if (!Number.isFinite(qty) || qty < 1 || qty > 50) {
      throw new BadRequestException('Quantidade deve ser entre 1 e 50.');
    }
    const reason = this.normalizeReason(input.reason);
    const guestName = input.guestName.trim();
    if (!guestName) throw new BadRequestException('Nome do convidado é obrigatório.');

    const event = await this.prisma.event.findFirst({
      where: { id: input.eventId, tenantId },
      include: { ticketing: true },
    });
    if (!event) throw new NotFoundException('Evento não encontrado.');

    const type = await this.prisma.eventTicketType.findFirst({
      where: { id: input.ticketTypeId, tenantId, eventId: input.eventId },
      include: { lots: true },
    });
    if (!type) throw new NotFoundException('Tipo de ingresso não encontrado.');

    let lotId = input.ticketLotId?.trim() || null;
    let lotName: string | null = null;
    let unitPrice = type.price ?? new Prisma.Decimal(0);
    if (type.lots.length > 0) {
      if (!lotId) throw new BadRequestException('Selecione o lote para este tipo.');
      const lot = type.lots.find((l) => l.id === lotId);
      if (!lot) throw new BadRequestException('Lote inválido.');
      lotName = lot.name;
      unitPrice = lot.price;
    } else if (lotId) {
      throw new BadRequestException('Este tipo não usa lote.');
    }

    const now = new Date();
    await this.assertCapacity(tenantId, input.eventId, type, lotId, qty, now);

    const currency = event.ticketing?.currency ?? 'USD';
    const admission = await this.prisma.eventComplimentaryAdmission.create({
      data: {
        tenantId,
        eventId: input.eventId,
        ticketTypeId: type.id,
        ticketLotId: lotId,
        guestName,
        guestEmail: input.guestEmail?.trim() || null,
        guestPhone: input.guestPhone?.trim() || null,
        quantity: qty,
        reason,
        notes: input.notes?.trim() || null,
        createdByUserId,
      },
    });

    const issued = await this.ensureTicketsForAdmission(admission.id, tenantId);
    return { admission: await this.getAdmissionDetail(admission.id, tenantId), ...issued };
  }

  private async assertCapacity(
    tenantId: string,
    eventId: string,
    type: Prisma.EventTicketTypeGetPayload<{ include: { lots: true } }>,
    lotId: string | null,
    qty: number,
    now: Date,
  ) {
    const maps = await this.inventory.loadForEvent(tenantId, eventId, now);
    const counters: InventoryCounters = {
      soldForType: (id) => this.inventory.soldForType(maps, id),
      heldForType: (id) => this.inventory.heldForType(maps, id),
      soldForLot: (id) => this.inventory.soldForLot(maps, id),
      heldForLot: (id) => this.inventory.heldForLot(maps, id),
    };
    const avail = resolveTypeAvailability(type, type.id, now, counters);
    if (lotId) {
      const lot = type.lots.find((l) => l.id === lotId)!;
      const sold = counters.soldForLot(lotId);
      const held = counters.heldForLot(lotId);
      const available = Math.max(0, lot.quantity - sold - held);
      if (qty > available) {
        throw new BadRequestException(`Capacidade insuficiente no lote (disponível: ${available}).`);
      }
      return;
    }
    if (qty > avail.available) {
      throw new BadRequestException(`Capacidade insuficiente (disponível: ${avail.available}).`);
    }
  }

  async ensureTicketsForAdmission(admissionId: string, tenantId: string) {
    const admission = await this.prisma.eventComplimentaryAdmission.findFirst({
      where: { id: admissionId, tenantId },
      include: {
        event: { select: { name: true, ticketing: true } },
        ticketType: true,
        ticketLot: true,
      },
    });
    if (!admission) throw new NotFoundException('Cortesia não encontrada.');
    if (admission.status === 'cancelled') {
      throw new BadRequestException('Cortesia cancelada.');
    }

    const unitPrice = admission.ticketLot?.price ?? admission.ticketType.price ?? new Prisma.Decimal(0);
    const currency = admission.event.ticketing?.currency ?? 'USD';
    const lotName = admission.ticketLot?.name ?? null;
    const ticketTypeName = admission.ticketType.name;
    const issuedAt = admission.createdAt;
    let created = 0;

    await this.prisma.$transaction(async (tx) => {
      const existingCount = await tx.eventTicket.count({
        where: { complimentaryAdmissionId: admissionId },
      });
      const indexes = lineIndexesToIssue(admission.quantity, existingCount);
      for (const lineIndex of indexes) {
        const outcome = await createEventTicketInTx(tx, {
          tenantId,
          eventId: admission.eventId,
          issuanceKey: complimentaryIssuanceKey(admissionId, lineIndex),
          admissionSource: 'complimentary',
          complimentaryAdmissionId: admissionId,
          ticketTypeId: admission.ticketTypeId,
          ticketLotId: admission.ticketLotId,
          lineIndex,
          orderNumber: `CORTESIA-${admission.id.slice(-8).toUpperCase()}`,
          ticketTypeName,
          lotName,
          unitPrice,
          currency,
          eventName: admission.event.name,
          holderName: admission.guestName,
          holderEmail: admission.guestEmail,
          issuedAt,
        });
        if (outcome === 'created') created += 1;
      }
    });

    const tickets = await this.listTicketsForAdmission(tenantId, admissionId);
    return { tickets, created };
  }

  private async listTicketsForAdmission(tenantId: string, admissionId: string) {
    const rows = await this.prisma.eventTicket.findMany({
      where: { tenantId, complimentaryAdmissionId: admissionId },
      orderBy: { lineIndex: 'asc' },
      include: { table: true, seat: true },
    });
    return rows.map((r) => ({
      id: r.id,
      ticketCode: r.ticketCode,
      qrPayload: buildCup360TicketQrPayload(r.qrToken),
      status: r.status,
      ticketTypeName: r.ticketTypeName,
      lotName: r.lotName,
      holderName: r.holderName,
      tableName: r.table?.name ?? null,
      seatLabel: r.seat?.seatLabel ?? null,
      issuedAt: r.issuedAt.toISOString(),
      usedAt: r.usedAt?.toISOString() ?? null,
    }));
  }

  async listGuestListForVenue(filters: {
    eventId: string;
    q?: string;
    reason?: string;
    status?: string;
  }) {
    const tenantId = await this.resolveTenantId();
    const where: Prisma.EventComplimentaryAdmissionWhereInput = {
      tenantId,
      eventId: filters.eventId,
    };
    if (filters.status === 'active' || filters.status === 'cancelled') {
      where.status = filters.status;
    }
    if (filters.reason?.trim()) where.reason = filters.reason.trim().toLowerCase();
    const q = filters.q?.trim();
    if (q) {
      where.OR = [
        { guestName: { contains: q, mode: 'insensitive' } },
        { guestEmail: { contains: q, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.eventComplimentaryAdmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        ticketType: { select: { name: true } },
        createdBy: { select: { name: true, username: true } },
        tickets: { select: { status: true } },
      },
    });

    return rows.map((r) => {
      const used = r.tickets.filter((t) => t.status === 'used').length;
      const valid = r.tickets.filter((t) => t.status === 'valid').length;
      const cancelled = r.tickets.filter((t) => t.status === 'cancelled').length;
      return {
        id: r.id,
        guestName: r.guestName,
        guestEmail: r.guestEmail,
        reason: r.reason,
        ticketTypeName: r.ticketType.name,
        quantity: r.quantity,
        ticketsIssued: r.tickets.length,
        usedCount: used,
        validCount: valid,
        cancelledCount: cancelled,
        remainingCount: valid,
        status: r.status,
        createdByLabel: r.createdBy?.name ?? r.createdBy?.username ?? null,
        createdAt: r.createdAt.toISOString(),
      };
    });
  }

  async getAdmissionDetail(id: string, tenantId?: string) {
    const tid = tenantId ?? (await this.resolveTenantId());
    const row = await this.prisma.eventComplimentaryAdmission.findFirst({
      where: { id, tenantId: tid },
      include: {
        ticketType: true,
        ticketLot: true,
        event: { select: { name: true } },
      },
    });
    if (!row) throw new NotFoundException('Cortesia não encontrada.');
    const tickets = await this.listTicketsForAdmission(tid, id);
    return {
      id: row.id,
      eventId: row.eventId,
      eventName: row.event.name,
      guestName: row.guestName,
      guestEmail: row.guestEmail,
      guestPhone: row.guestPhone,
      quantity: row.quantity,
      reason: row.reason,
      notes: row.notes,
      status: row.status,
      ticketTypeId: row.ticketTypeId,
      ticketTypeName: row.ticketType.name,
      ticketLotId: row.ticketLotId,
      lotName: row.ticketLot?.name ?? null,
      createdAt: row.createdAt.toISOString(),
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      tickets,
    };
  }

  async getAdmissionDetailForVenue(id: string) {
    return this.getAdmissionDetail(id);
  }

  async issueComplimentaryForVenue(id: string) {
    const tenantId = await this.resolveTenantId();
    const issued = await this.ensureTicketsForAdmission(id, tenantId);
    return { ...issued, admission: await this.getAdmissionDetail(id, tenantId) };
  }

  async cancelUnusedTicketsForVenue(id: string) {
    const tenantId = await this.resolveTenantId();
    const admission = await this.prisma.eventComplimentaryAdmission.findFirst({
      where: { id, tenantId },
    });
    if (!admission) throw new NotFoundException('Cortesia não encontrada.');
    const now = new Date();
    const res = await this.prisma.eventTicket.updateMany({
      where: { complimentaryAdmissionId: id, status: 'valid' },
      data: { status: 'cancelled', cancelledAt: now },
    });
    const remainingValid = await this.prisma.eventTicket.count({
      where: { complimentaryAdmissionId: id, status: 'valid' },
    });
    if (remainingValid === 0 && admission.status === 'active') {
      await this.prisma.eventComplimentaryAdmission.update({
        where: { id },
        data: { status: 'cancelled', cancelledAt: now },
      });
    }
    return { cancelledTickets: res.count, admission: await this.getAdmissionDetail(id, tenantId) };
  }

  async searchGuestsForVenue(eventId: string, q: string) {
    const tenantId = await this.resolveTenantId();
    const term = q.trim();
    if (!term) return [];
    const tickets = await this.prisma.eventTicket.findMany({
      where: {
        tenantId,
        eventId,
        admissionSource: 'complimentary',
        OR: [
          { holderName: { contains: term, mode: 'insensitive' } },
          { ticketCode: { equals: term, mode: 'insensitive' } },
        ],
      },
      take: 40,
      orderBy: { holderName: 'asc' },
      include: { table: true, seat: true },
    });
    return tickets.map((t) => ({
      id: t.id,
      ticketCode: t.ticketCode,
      holderName: t.holderName,
      status: t.status,
      ticketTypeName: t.ticketTypeName,
      tableName: t.table?.name ?? null,
      seatLabel: t.seat?.seatLabel ?? null,
      complimentaryAdmissionId: t.complimentaryAdmissionId,
    }));
  }
}
