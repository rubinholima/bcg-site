import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BostonCityHallBarService } from './boston-city-hall-bar.service';
import { BostonCityHallTicketCheckinService } from './boston-city-hall-ticket-checkin.service';
import { BostonCityHallSeatingService } from './boston-city-hall-seating.service';
import {
  checkinStationLabel,
  mapCheckinSession,
} from './boston-city-hall-checkin-session.mapper';

@Injectable()
export class BostonCityHallCheckinSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bar: BostonCityHallBarService,
    private readonly checkin: BostonCityHallTicketCheckinService,
    private readonly seating: BostonCityHallSeatingService,
  ) {}

  private async tenantId() {
    return this.bar.resolveBchTenantId();
  }

  private async assertEvent(tenantId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId.trim(), tenantId },
      select: { id: true },
    });
    if (!event) throw new NotFoundException('Evento não encontrado.');
    return event;
  }

  async listStations(eventId: string) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    return this.prisma.bchCheckinStation.findMany({
      where: { tenantId, eventId: eventId.trim() },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });
  }

  async createStation(
    eventId: string,
    body: { name: string; location?: string | null; deviceLabel?: string | null },
  ) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    const name = body.name.trim();
    if (!name) throw new BadRequestException('Nome da estação é obrigatório.');
    return this.prisma.bchCheckinStation.create({
      data: {
        tenantId,
        eventId: eventId.trim(),
        name,
        location: body.location?.trim() || null,
        deviceLabel: body.deviceLabel?.trim() || null,
        active: true,
      },
    });
  }

  async patchStation(
    eventId: string,
    stationId: string,
    body: Partial<{ name: string; location: string | null; active: boolean; deviceLabel: string | null }>,
  ) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    const row = await this.prisma.bchCheckinStation.findFirst({
      where: { id: stationId, tenantId, eventId: eventId.trim() },
    });
    if (!row) throw new NotFoundException('Estação não encontrada.');
    return this.prisma.bchCheckinStation.update({
      where: { id: stationId },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.location !== undefined ? { location: body.location?.trim() || null } : {}),
        ...(body.active !== undefined ? { active: body.active } : {}),
        ...(body.deviceLabel !== undefined ? { deviceLabel: body.deviceLabel?.trim() || null } : {}),
      },
    });
  }

  async getActiveSession(eventId: string, operatorUserId: string | null) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    const row = await this.prisma.bchCheckinSession.findFirst({
      where: {
        tenantId,
        eventId: eventId.trim(),
        status: 'open',
        ...(operatorUserId ? { operatorUserId } : {}),
      },
      include: { station: true },
      orderBy: { openedAt: 'desc' },
    });
    return mapCheckinSession(row);
  }

  async openSession(
    eventId: string,
    body: { stationId: string; deviceLabel?: string | null },
    operatorUserId: string | null,
  ) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    const station = await this.prisma.bchCheckinStation.findFirst({
      where: { id: body.stationId, tenantId, eventId: eventId.trim(), active: true },
    });
    if (!station) throw new BadRequestException('Estação inválida ou inativa.');
    const existing = await this.prisma.bchCheckinSession.findFirst({
      where: { tenantId, stationId: station.id, status: 'open' },
    });
    if (existing) throw new BadRequestException('Já existe sessão aberta nesta estação.');
    const created = await this.prisma.bchCheckinSession.create({
      data: {
        tenantId,
        eventId: eventId.trim(),
        stationId: station.id,
        operatorUserId,
        deviceLabel: body.deviceLabel?.trim() || station.deviceLabel,
        status: 'open',
      },
      include: { station: true },
    });
    return mapCheckinSession(created);
  }

  async closeSession(eventId: string, sessionId: string, notes?: string | null) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    const session = await this.prisma.bchCheckinSession.findFirst({
      where: { id: sessionId, tenantId, eventId: eventId.trim(), status: 'open' },
    });
    if (!session) throw new NotFoundException('Sessão não encontrada ou já encerrada.');
    const closed = await this.prisma.bchCheckinSession.update({
      where: { id: sessionId },
      data: {
        status: 'closed',
        closedAt: new Date(),
        notes: notes?.trim() || session.notes,
      },
      include: { station: true },
    });
    return mapCheckinSession(closed);
  }

  async scanInSession(
    eventId: string,
    sessionId: string,
    scanInput: string,
    operatorUserId: string | null,
  ) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    const session = await this.prisma.bchCheckinSession.findFirst({
      where: { id: sessionId, tenantId, eventId: eventId.trim(), status: 'open' },
      include: { station: true },
    });
    if (!session) throw new BadRequestException('Sessão encerrada ou inválida.');
    const stationLabel = checkinStationLabel(
      session.station
        ? {
            id: session.station.id,
            name: session.station.name,
            location: session.station.location,
            active: session.station.active,
          }
        : null,
    );
    const result = await this.checkin.performCheckin({
      tenantId,
      eventId: eventId.trim(),
      scanInput,
      operatorUserId,
      stationLabel,
      stationId: session.stationId,
      sessionId: session.id,
    });
    return result;
  }

  async getSummary(eventId: string) {
    const tenantId = await this.tenantId();
    await this.assertEvent(tenantId, eventId);
    const [issued, accepted, duplicate, rejected] = await Promise.all([
      this.prisma.eventTicket.count({
        where: { tenantId, eventId: eventId.trim(), status: { in: ['valid', 'used'] } },
      }),
      this.prisma.eventTicketCheckin.count({
        where: { tenantId, eventId: eventId.trim(), result: 'accepted' },
      }),
      this.prisma.eventTicketCheckin.count({
        where: { tenantId, eventId: eventId.trim(), result: 'already_used' },
      }),
      this.prisma.eventTicketCheckin.count({
        where: {
          tenantId,
          eventId: eventId.trim(),
          result: { in: ['invalid', 'cancelled', 'wrong_event'] },
        },
      }),
    ]);
    return { issued, accepted, duplicate, rejected };
  }

  searchTickets(eventId: string, q: string) {
    return this.seating.searchTicketsForEvent(eventId, q);
  }
}
