import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BostonCityHallBarService } from './boston-city-hall-bar.service';
import { BCH_VENUE_SLUG } from './boston-city-hall.constants';

@Injectable()
export class BostonCityHallEventVenueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bar: BostonCityHallBarService,
  ) {}

  private async tenantId(): Promise<string> {
    return this.bar.resolveBchTenantId();
  }

  async getEventVenueSpace(eventId: string) {
    const tenantId = await this.tenantId();
    const event = await this.prisma.event.findFirst({
      where: { id: eventId.trim(), tenantId },
      select: {
        id: true,
        bchVenueSpaceId: true,
        startDate: true,
        endDate: true,
        bchVenueSpace: {
          select: {
            id: true,
            name: true,
            slug: true,
            capacitySeated: true,
            capacityStanding: true,
            active: true,
          },
        },
        venueBooking: {
          select: {
            id: true,
            spaceId: true,
            space: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!event) throw new NotFoundException('Evento não encontrado.');
    const space = event.bchVenueSpace ?? event.venueBooking?.space ?? null;
    return {
      eventId: event.id,
      venueSpaceId: event.bchVenueSpaceId ?? event.venueBooking?.spaceId ?? null,
      space,
      bookingId: event.venueBooking?.id ?? null,
    };
  }

  async setEventVenueSpace(eventId: string, spaceId: string) {
    const tenantId = await this.tenantId();
    const event = await this.prisma.event.findFirst({
      where: { id: eventId.trim(), tenantId },
      select: { id: true, startDate: true, endDate: true },
    });
    if (!event) throw new NotFoundException('Evento não encontrado.');
    const space = await this.prisma.venueSpace.findFirst({
      where: { id: spaceId.trim(), tenantId, venueSlug: BCH_VENUE_SLUG, active: true },
    });
    if (!space) throw new BadRequestException('Espaço inválido ou inativo.');
    const conflicts = await this.checkSpaceConflicts(
      tenantId,
      space.id,
      event.id,
      event.startDate,
      event.endDate,
    );
    if (conflicts.length > 0) {
      throw new BadRequestException(
        `Conflito de agenda com: ${conflicts.map((c) => c.label).join(', ')}`,
      );
    }
    await this.prisma.event.update({
      where: { id: event.id },
      data: { bchVenueSpaceId: space.id },
    });
    return this.getEventVenueSpace(event.id);
  }

  private async checkSpaceConflicts(
    tenantId: string,
    spaceId: string,
    excludeEventId: string,
    start: Date | null,
    end: Date | null,
  ) {
    if (!start) return [];
    const rangeEnd = end ?? new Date(start.getTime() + 2 * 3600000);
    const bookings = await this.prisma.venueBooking.findMany({
      where: {
        tenantId,
        spaceId,
        status: { in: ['confirmed', 'hold', 'blocked'] },
        NOT: { eventId: excludeEventId },
        AND: [
          { startAt: { lt: rangeEnd } },
          { endAt: { gt: start } },
        ],
      },
      select: {
        id: true,
        title: true,
        event: { select: { name: true } },
      },
      take: 5,
    });
    const otherEvents = await this.prisma.event.findMany({
      where: {
        tenantId,
        bchVenueSpaceId: spaceId,
        id: { not: excludeEventId },
        startDate: { not: null },
        AND: [
          { startDate: { lt: rangeEnd } },
          {
            OR: [{ endDate: { gt: start } }, { endDate: null }],
          },
        ],
      },
      select: { id: true, name: true },
      take: 5,
    });
    const out: { label: string }[] = [];
    for (const b of bookings) {
      out.push({ label: b.event?.name ?? b.title ?? b.id });
    }
    for (const e of otherEvents) {
      out.push({ label: e.name });
    }
    return out;
  }
}
