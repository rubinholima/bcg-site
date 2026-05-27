import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  BCH_VENUE_SLUG,
  DEFAULT_VENUE_SPACES,
  VENUE_BOOKING_STATUSES,
  VENUE_PIPELINE_STAGES,
  type VenueBookingDto,
  type VenueOverviewDto,
  type VenuePipelineLeadDto,
  type VenueSpaceDto,
} from './boston-city-hall.constants';

function toSpaceDto(row: {
  id: string;
  venueSlug: string;
  name: string;
  slug: string;
  capacityStanding: number | null;
  capacitySeated: number | null;
  sortOrder: number;
  active: boolean;
}): VenueSpaceDto {
  return {
    id: row.id,
    venueSlug: row.venueSlug,
    name: row.name,
    slug: row.slug,
    capacityStanding: row.capacityStanding,
    capacitySeated: row.capacitySeated,
    sortOrder: row.sortOrder,
    active: row.active,
  };
}

function toBookingDto(
  row: {
    id: string;
    venueSlug: string;
    spaceId: string;
    title: string;
    eventType: string | null;
    startAt: Date;
    endAt: Date;
    status: string;
    pipelineLeadId: string | null;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    guestCount: number | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    space?: { name: string } | null;
  },
): VenueBookingDto {
  return {
    id: row.id,
    venueSlug: row.venueSlug,
    spaceId: row.spaceId,
    spaceName: row.space?.name,
    title: row.title,
    eventType: row.eventType,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    status: row.status,
    pipelineLeadId: row.pipelineLeadId,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    guestCount: row.guestCount,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toLeadDto(
  row: {
    id: string;
    venueSlug: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string | null;
    companyName: string | null;
    eventType: string | null;
    guestCount: number | null;
    preferredDate: Date | null;
    message: string | null;
    stage: string;
    source: string;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    booking?: Parameters<typeof toBookingDto>[0] | null;
  },
): VenuePipelineLeadDto {
  return {
    id: row.id,
    venueSlug: row.venueSlug,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    companyName: row.companyName,
    eventType: row.eventType,
    guestCount: row.guestCount,
    preferredDate: row.preferredDate?.toISOString() ?? null,
    message: row.message,
    stage: row.stage,
    source: row.source,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    booking: row.booking ? toBookingDto(row.booking) : null,
  };
}

function assertBookingStatus(status: string) {
  if (!VENUE_BOOKING_STATUSES.includes(status as (typeof VENUE_BOOKING_STATUSES)[number])) {
    throw new BadRequestException(`Status de reserva inválido: ${status}`);
  }
}

function assertPipelineStage(stage: string) {
  if (!VENUE_PIPELINE_STAGES.includes(stage as (typeof VENUE_PIPELINE_STAGES)[number])) {
    throw new BadRequestException(`Estágio de pipeline inválido: ${stage}`);
  }
}

@Injectable()
export class BostonCityHallService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaultSpaces(venueSlug = BCH_VENUE_SLUG) {
    for (const s of DEFAULT_VENUE_SPACES) {
      await this.prisma.venueSpace.upsert({
        where: { venueSlug_slug: { venueSlug, slug: s.slug } },
        create: {
          venueSlug,
          name: s.name,
          slug: s.slug,
          capacityStanding: s.capacityStanding ?? null,
          capacitySeated: s.capacitySeated ?? null,
          sortOrder: s.sortOrder,
        },
        update: {
          name: s.name,
          capacityStanding: s.capacityStanding ?? null,
          capacitySeated: s.capacitySeated ?? null,
          sortOrder: s.sortOrder,
        },
      });
    }
  }

  async getOverview(venueSlug = BCH_VENUE_SLUG): Promise<VenueOverviewDto> {
    await this.ensureDefaultSpaces(venueSlug);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [spacesCount, bookingsThisMonth, confirmedUpcoming, pipelineGroups] =
      await Promise.all([
        this.prisma.venueSpace.count({ where: { venueSlug, active: true } }),
        this.prisma.venueBooking.count({
          where: {
            venueSlug,
            status: { not: 'cancelled' },
            startAt: { gte: monthStart, lte: monthEnd },
          },
        }),
        this.prisma.venueBooking.count({
          where: {
            venueSlug,
            status: 'confirmed',
            startAt: { gte: now },
          },
        }),
        this.prisma.venuePipelineLead.groupBy({
          by: ['stage'],
          where: { venueSlug },
          _count: { id: true },
        }),
      ]);

    const pipelineByStage: Record<string, number> = {};
    for (const s of VENUE_PIPELINE_STAGES) pipelineByStage[s] = 0;
    for (const g of pipelineGroups) {
      pipelineByStage[g.stage] = g._count.id;
    }

    const [
      leadsOpen,
      leadsTotal,
      leadsNewThisMonth,
      leadsWon,
      bookingGroups,
      sourceGroups,
      recentLeads,
    ] = await Promise.all([
      this.prisma.venuePipelineLead.count({
        where: {
          venueSlug,
          stage: { notIn: ['confirmado', 'perdido'] },
        },
      }),
      this.prisma.venuePipelineLead.count({ where: { venueSlug } }),
      this.prisma.venuePipelineLead.count({
        where: { venueSlug, createdAt: { gte: monthStart, lte: monthEnd } },
      }),
      this.prisma.venuePipelineLead.count({
        where: { venueSlug, stage: 'confirmado' },
      }),
      this.prisma.venueBooking.groupBy({
        by: ['status'],
        where: { venueSlug },
        _count: { id: true },
      }),
      this.prisma.venuePipelineLead.groupBy({
        by: ['source'],
        where: { venueSlug },
        _count: { id: true },
      }),
      this.prisma.venuePipelineLead.findMany({
        where: {
          venueSlug,
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29),
          },
        },
        select: { createdAt: true },
      }),
    ]);

    const bookingsByStatus: Record<string, number> = {};
    for (const s of VENUE_BOOKING_STATUSES) bookingsByStatus[s] = 0;
    for (const g of bookingGroups) {
      bookingsByStatus[g.status] = g._count.id;
    }

    const leadsBySource = sourceGroups.map((g) => ({
      source: g.source,
      count: g._count.id,
    }));

    const dayCounts = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      dayCounts.set(d.toISOString().slice(0, 10), 0);
    }
    for (const row of recentLeads) {
      const key = row.createdAt.toISOString().slice(0, 10);
      if (dayCounts.has(key)) dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
    }
    const leadsLast30Days = [...dayCounts.entries()].map(([date, count]) => ({
      date,
      count,
    }));

    return {
      spacesCount,
      bookingsThisMonth,
      confirmedUpcoming,
      pipelineByStage,
      leadsOpen,
      leadsTotal,
      leadsNewThisMonth,
      leadsWon,
      bookingsByStatus,
      leadsLast30Days,
      leadsBySource,
    };
  }

  async listSpaces(venueSlug = BCH_VENUE_SLUG): Promise<VenueSpaceDto[]> {
    await this.ensureDefaultSpaces(venueSlug);
    const rows = await this.prisma.venueSpace.findMany({
      where: { venueSlug, active: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map(toSpaceDto);
  }

  async listBookings(filters: {
    venueSlug?: string;
    from?: string;
    to?: string;
    spaceId?: string;
    status?: string;
  }): Promise<VenueBookingDto[]> {
    const venueSlug = filters.venueSlug ?? BCH_VENUE_SLUG;
    const where: Record<string, unknown> = { venueSlug };
    if (filters.spaceId) where.spaceId = filters.spaceId;
    if (filters.status) where.status = filters.status;
    if (filters.from || filters.to) {
      where.startAt = {};
      if (filters.from) (where.startAt as Record<string, Date>).gte = new Date(filters.from);
      if (filters.to) (where.startAt as Record<string, Date>).lte = new Date(filters.to);
    }

    const rows = await this.prisma.venueBooking.findMany({
      where,
      include: { space: { select: { name: true } } },
      orderBy: { startAt: 'asc' },
    });
    return rows.map(toBookingDto);
  }

  async createBooking(dto: {
    spaceId: string;
    title: string;
    eventType?: string;
    startAt: string;
    endAt: string;
    status?: string;
    pipelineLeadId?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    guestCount?: number;
    notes?: string;
    venueSlug?: string;
  }): Promise<VenueBookingDto> {
    const venueSlug = dto.venueSlug ?? BCH_VENUE_SLUG;
    const status = dto.status ?? 'hold';
    assertBookingStatus(status);
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime()) || endAt <= startAt) {
      throw new BadRequestException('Datas inválidas');
    }

    const space = await this.prisma.venueSpace.findFirst({
      where: { id: dto.spaceId, venueSlug, active: true },
    });
    if (!space) throw new NotFoundException('Espaço não encontrado');

    const row = await this.prisma.venueBooking.create({
      data: {
        venueSlug,
        spaceId: dto.spaceId,
        title: dto.title.trim(),
        eventType: dto.eventType?.trim() || null,
        startAt,
        endAt,
        status,
        pipelineLeadId: dto.pipelineLeadId || null,
        contactName: dto.contactName?.trim() || null,
        contactEmail: dto.contactEmail?.trim() || null,
        contactPhone: dto.contactPhone?.trim() || null,
        guestCount: dto.guestCount ?? null,
        notes: dto.notes?.trim() || null,
      },
      include: { space: { select: { name: true } } },
    });
    return toBookingDto(row);
  }

  async updateBooking(
    id: string,
    dto: Partial<{
      spaceId: string;
      title: string;
      eventType: string;
      startAt: string;
      endAt: string;
      status: string;
      contactName: string;
      contactEmail: string;
      contactPhone: string;
      guestCount: number;
      notes: string;
    }>,
  ): Promise<VenueBookingDto> {
    const existing = await this.prisma.venueBooking.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Reserva não encontrada');

    if (dto.status) assertBookingStatus(dto.status);
    const data: Record<string, unknown> = {};
    if (dto.spaceId !== undefined) data.spaceId = dto.spaceId;
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.eventType !== undefined) data.eventType = dto.eventType.trim() || null;
    if (dto.startAt !== undefined) data.startAt = new Date(dto.startAt);
    if (dto.endAt !== undefined) data.endAt = new Date(dto.endAt);
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.contactName !== undefined) data.contactName = dto.contactName.trim() || null;
    if (dto.contactEmail !== undefined) data.contactEmail = dto.contactEmail.trim() || null;
    if (dto.contactPhone !== undefined) data.contactPhone = dto.contactPhone.trim() || null;
    if (dto.guestCount !== undefined) data.guestCount = dto.guestCount;
    if (dto.notes !== undefined) data.notes = dto.notes.trim() || null;

    const row = await this.prisma.venueBooking.update({
      where: { id },
      data,
      include: { space: { select: { name: true } } },
    });
    return toBookingDto(row);
  }

  async deleteBooking(id: string): Promise<void> {
    const existing = await this.prisma.venueBooking.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Reserva não encontrada');
    await this.prisma.venueBooking.delete({ where: { id } });
  }

  async listPipeline(venueSlug = BCH_VENUE_SLUG): Promise<VenuePipelineLeadDto[]> {
    const rows = await this.prisma.venuePipelineLead.findMany({
      where: { venueSlug },
      include: {
        booking: { include: { space: { select: { name: true } } } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map(toLeadDto);
  }

  async createPipelineLead(dto: {
    contactName: string;
    contactEmail: string;
    contactPhone?: string;
    companyName?: string;
    eventType?: string;
    guestCount?: number;
    preferredDate?: string;
    message?: string;
    stage?: string;
    source?: string;
    notes?: string;
    venueSlug?: string;
  }): Promise<VenuePipelineLeadDto> {
    const venueSlug = dto.venueSlug ?? BCH_VENUE_SLUG;
    const stage = dto.stage ?? 'lead';
    assertPipelineStage(stage);

    const row = await this.prisma.venuePipelineLead.create({
      data: {
        venueSlug,
        contactName: dto.contactName.trim(),
        contactEmail: dto.contactEmail.trim(),
        contactPhone: dto.contactPhone?.trim() || null,
        companyName: dto.companyName?.trim() || null,
        eventType: dto.eventType?.trim() || null,
        guestCount: dto.guestCount ?? null,
        preferredDate: dto.preferredDate ? new Date(dto.preferredDate) : null,
        message: dto.message?.trim() || null,
        stage,
        source: dto.source?.trim() || 'manual',
        notes: dto.notes?.trim() || null,
      },
    });
    return toLeadDto(row);
  }

  async createPipelineLeadFromWebsite(dto: {
    name: string;
    email: string;
    phone?: string;
    message: string;
    eventType?: string;
    guestCount?: number;
    preferredDate?: string;
  }): Promise<VenuePipelineLeadDto> {
    return this.createPipelineLead({
      contactName: dto.name,
      contactEmail: dto.email,
      contactPhone: dto.phone,
      message: dto.message,
      eventType: dto.eventType,
      guestCount: dto.guestCount,
      preferredDate: dto.preferredDate,
      source: 'website',
      stage: 'lead',
    });
  }

  async updatePipelineLead(
    id: string,
    dto: Partial<{
      contactName: string;
      contactEmail: string;
      contactPhone: string;
      companyName: string;
      eventType: string;
      guestCount: number;
      preferredDate: string;
      message: string;
      stage: string;
      notes: string;
    }>,
  ): Promise<VenuePipelineLeadDto> {
    const existing = await this.prisma.venuePipelineLead.findUnique({
      where: { id },
      include: { booking: true },
    });
    if (!existing) throw new NotFoundException('Lead não encontrado');
    if (dto.stage) assertPipelineStage(dto.stage);

    const data: Record<string, unknown> = {};
    if (dto.contactName !== undefined) data.contactName = dto.contactName.trim();
    if (dto.contactEmail !== undefined) data.contactEmail = dto.contactEmail.trim();
    if (dto.contactPhone !== undefined) data.contactPhone = dto.contactPhone.trim() || null;
    if (dto.companyName !== undefined) data.companyName = dto.companyName.trim() || null;
    if (dto.eventType !== undefined) data.eventType = dto.eventType.trim() || null;
    if (dto.guestCount !== undefined) data.guestCount = dto.guestCount;
    if (dto.preferredDate !== undefined) {
      data.preferredDate = dto.preferredDate ? new Date(dto.preferredDate) : null;
    }
    if (dto.message !== undefined) data.message = dto.message.trim() || null;
    if (dto.stage !== undefined) data.stage = dto.stage;
    if (dto.notes !== undefined) data.notes = dto.notes.trim() || null;

    const row = await this.prisma.venuePipelineLead.update({
      where: { id },
      data,
      include: {
        booking: { include: { space: { select: { name: true } } } },
      },
    });

    if (dto.stage === 'confirmado' && !row.booking && row.preferredDate) {
      const spaces = await this.listSpaces(row.venueSlug);
      const spaceId = spaces[0]?.id;
      if (spaceId) {
        const start = new Date(row.preferredDate);
        const end = new Date(start);
        end.setHours(end.getHours() + 4);
        await this.createBooking({
          venueSlug: row.venueSlug,
          spaceId,
          title: row.companyName || row.contactName,
          eventType: row.eventType ?? undefined,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          status: 'hold',
          pipelineLeadId: row.id,
          contactName: row.contactName,
          contactEmail: row.contactEmail,
          contactPhone: row.contactPhone ?? undefined,
          guestCount: row.guestCount ?? undefined,
          notes: row.message ?? undefined,
        });
      }
    }

    const refreshed = await this.prisma.venuePipelineLead.findUnique({
      where: { id },
      include: {
        booking: { include: { space: { select: { name: true } } } },
      },
    });
    return toLeadDto(refreshed!);
  }
}
