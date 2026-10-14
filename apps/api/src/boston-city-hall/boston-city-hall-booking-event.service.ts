import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  buildDefaultEventPageContent,
  slugifyEventSlug,
} from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BCH_VENUE_SLUG,
  type VenueBookingEventPrefillDto,
  type VenueBookingEventRefDto,
} from './boston-city-hall.constants';

const ELIGIBLE_STATUSES = new Set(['confirmed']);

@Injectable()
export class BostonCityHallBookingEventService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveTenantId(venueSlug = BCH_VENUE_SLUG): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: venueSlug },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant do venue "${venueSlug}" não encontrado.`);
    }
    return tenant.id;
  }

  private assertEligible(status: string, eventId: string | null) {
    if (eventId) {
      throw new ConflictException('Esta reserva já possui evento vinculado.');
    }
    if (!ELIGIBLE_STATUSES.has(status)) {
      throw new BadRequestException(
        'Só reservas confirmadas podem gerar evento. Pré-reserva, bloqueio e cancelado não são elegíveis.',
      );
    }
  }

  private async uniqueSlug(base: string): Promise<string> {
    let slug = slugifyEventSlug(base) || 'evento';
    let n = 0;
    while (true) {
      const candidate = n === 0 ? slug : `${slug}-${n}`;
      const existing = await this.prisma.event.findUnique({ where: { slug: candidate } });
      if (!existing) return candidate;
      n += 1;
      if (n > 50) {
        slug = `${slug}-${Date.now()}`;
        n = 0;
      }
    }
  }

  private toEventRef(row: {
    id: string;
    name: string;
    slug: string;
    status: string;
  }): VenueBookingEventRefDto {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
    };
  }

  async getPrefill(bookingId: string): Promise<VenueBookingEventPrefillDto> {
    const tenantId = await this.resolveTenantId();
    const booking = await this.prisma.venueBooking.findFirst({
      where: { id: bookingId, tenantId, venueSlug: BCH_VENUE_SLUG },
      include: {
        space: { select: { name: true } },
        event: { select: { id: true, name: true, slug: true, status: true } },
      },
    });
    if (!booking) throw new NotFoundException('Reserva não encontrada');

    const locationLabel = `Boston City Hall${booking.space?.name ? ` · ${booking.space.name}` : ''}`;
    const baseSlug = await this.uniqueSlug(`${booking.title}-bch`);

    return {
      bookingId: booking.id,
      eligible: ELIGIBLE_STATUSES.has(booking.status) && !booking.eventId,
      bookingStatus: booking.status,
      existingEvent: booking.event ? this.toEventRef(booking.event) : null,
      suggested: {
        name: booking.title.trim(),
        slug: baseSlug,
        category: 'other' as const,
        organizer: 'tenant' as const,
        tenantId,
        startDate: booking.startAt.toISOString(),
        endDate: booking.endAt.toISOString(),
        locationLabel,
        description: booking.eventType
          ? `${locationLabel}\n\nTipo: ${booking.eventType}`
          : locationLabel,
      },
    };
  }

  async createEventFromBooking(
    bookingId: string,
    dto: {
      name: string;
      slug?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      category?: 'football' | 'other';
    },
  ): Promise<VenueBookingEventRefDto> {
    const tenantId = await this.resolveTenantId();
    const booking = await this.prisma.venueBooking.findFirst({
      where: { id: bookingId, tenantId, venueSlug: BCH_VENUE_SLUG },
      select: { id: true, status: true, eventId: true, title: true },
    });
    if (!booking) throw new NotFoundException('Reserva não encontrada');
    this.assertEligible(booking.status, booking.eventId);

    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Nome do evento é obrigatório.');

    const slug = await this.uniqueSlug(dto.slug?.trim() || name);
    const category = dto.category === 'football' ? 'football' : 'other';
    const content = buildDefaultEventPageContent(name) as object;

    const result = await this.prisma.$transaction(async (tx) => {
      const event = await tx.event.create({
        data: {
          slug,
          name,
          description: dto.description?.trim() || null,
          organizer: 'tenant',
          tenantId,
          category,
          fixtureCategory: null,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          logoUrl: null,
          content,
          competitionFormat: Prisma.JsonNull,
          status: 'draft',
        },
        select: { id: true, name: true, slug: true, status: true },
      });

      const updated = await tx.venueBooking.updateMany({
        where: { id: bookingId, tenantId, eventId: null },
        data: { eventId: event.id },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Reserva já possui evento ou foi alterada.');
      }
      return event;
    });

    return this.toEventRef(result);
  }

  async listEligibleBookingsForEvent(eventId: string) {
    const tenantId = await this.resolveTenantId();
    const event = await this.prisma.event.findFirst({
      where: { id: eventId.trim(), tenantId },
      select: { id: true },
    });
    if (!event) throw new NotFoundException('Evento não encontrado.');
    const rows = await this.prisma.venueBooking.findMany({
      where: {
        tenantId,
        venueSlug: BCH_VENUE_SLUG,
        status: 'confirmed',
        OR: [{ eventId: null }, { eventId: event.id }],
      },
      include: { space: { select: { name: true } } },
      orderBy: { startAt: 'desc' },
      take: 40,
    });
    return rows.map((b) => ({
      bookingId: b.id,
      title: b.title,
      startAt: b.startAt.toISOString(),
      endAt: b.endAt.toISOString(),
      spaceName: b.space.name,
      linkedToThisEvent: b.eventId === event.id,
    }));
  }

  async linkExistingEvent(
    bookingId: string,
    dto: { eventId: string },
  ): Promise<VenueBookingEventRefDto> {
    const tenantId = await this.resolveTenantId();
    const eventId = dto.eventId?.trim();
    if (!eventId) throw new BadRequestException('Evento é obrigatório.');

    const booking = await this.prisma.venueBooking.findFirst({
      where: { id: bookingId, tenantId, venueSlug: BCH_VENUE_SLUG },
      select: { id: true, status: true, eventId: true },
    });
    if (!booking) throw new NotFoundException('Reserva não encontrada');
    this.assertEligible(booking.status, booking.eventId);

    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, organizer: 'tenant' },
      include: { venueBooking: { select: { id: true } } },
    });
    if (!event) {
      throw new NotFoundException('Evento não encontrado para este tenant.');
    }
    if (event.venueBooking && event.venueBooking.id !== bookingId) {
      throw new ConflictException('Este evento já está vinculado a outra reserva.');
    }

    await this.prisma.venueBooking.update({
      where: { id: bookingId },
      data: { eventId: event.id },
    });

    return this.toEventRef(event);
  }
}
