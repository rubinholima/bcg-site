import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseDateOnlyBrazil, parseDateTimeBrazil } from '../common/brazil-time.util';
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

  /** Venue operacional usa o mesmo slug do Tenant (ex.: boston-city-hall). */
  private async resolveVenueContext(venueSlug = BCH_VENUE_SLUG): Promise<{
    tenantId: string;
    venueSlug: string;
  }> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: venueSlug },
      select: { id: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant do venue "${venueSlug}" não encontrado.`);
    }
    return { tenantId: tenant.id, venueSlug };
  }

  async ensureDefaultSpaces(venueSlug = BCH_VENUE_SLUG) {
    const { tenantId, venueSlug: slug } = await this.resolveVenueContext(venueSlug);
    for (const s of DEFAULT_VENUE_SPACES) {
      await this.prisma.venueSpace.upsert({
        where: { venueSlug_slug: { venueSlug: slug, slug: s.slug } },
        create: {
          tenantId,
          venueSlug: slug,
          name: s.name,
          slug: s.slug,
          capacityStanding: s.capacityStanding ?? null,
          capacitySeated: s.capacitySeated ?? null,
          sortOrder: s.sortOrder,
        },
        update: {
          tenantId,
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
    const { tenantId, venueSlug: slug } = await this.resolveVenueContext(venueSlug);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const activeBookingWhere = {
      tenantId,
      venueSlug: slug,
      status: { not: 'cancelled' as const },
    };

    const [spacesCount, bookingsThisMonth, confirmedUpcoming, pipelineGroups] =
      await Promise.all([
        this.prisma.venueSpace.count({ where: { tenantId, venueSlug: slug, active: true } }),
        this.prisma.venueBooking.count({
          where: {
            tenantId,
            venueSlug: slug,
            status: { not: 'cancelled' },
            startAt: { gte: monthStart, lte: monthEnd },
          },
        }),
        this.prisma.venueBooking.count({
          where: {
            tenantId,
            venueSlug: slug,
            status: 'confirmed',
            startAt: { gte: now },
          },
        }),
        this.prisma.venuePipelineLead.groupBy({
          by: ['stage'],
          where: { tenantId, venueSlug: slug },
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
      bookingsToday,
      upcomingBookingsTotal,
      upcomingBookingRows,
      attentionLeadRows,
    ] = await Promise.all([
      this.prisma.venuePipelineLead.count({
        where: {
          tenantId,
          venueSlug: slug,
          stage: { notIn: ['confirmado', 'perdido'] },
        },
      }),
      this.prisma.venuePipelineLead.count({ where: { tenantId, venueSlug: slug } }),
      this.prisma.venuePipelineLead.count({
        where: { tenantId, venueSlug: slug, createdAt: { gte: monthStart, lte: monthEnd } },
      }),
      this.prisma.venuePipelineLead.count({
        where: { tenantId, venueSlug: slug, stage: 'confirmado' },
      }),
      this.prisma.venueBooking.groupBy({
        by: ['status'],
        where: { tenantId, venueSlug: slug },
        _count: { id: true },
      }),
      this.prisma.venuePipelineLead.groupBy({
        by: ['source'],
        where: { tenantId, venueSlug: slug },
        _count: { id: true },
      }),
      this.prisma.venuePipelineLead.findMany({
        where: {
          tenantId,
          venueSlug: slug,
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29),
          },
        },
        select: { createdAt: true },
      }),
      this.prisma.venueBooking.count({
        where: {
          ...activeBookingWhere,
          startAt: { lte: endOfToday },
          endAt: { gte: startOfToday },
        },
      }),
      this.prisma.venueBooking.count({
        where: {
          ...activeBookingWhere,
          endAt: { gte: now },
        },
      }),
      this.prisma.venueBooking.findMany({
        where: {
          ...activeBookingWhere,
          endAt: { gte: now },
        },
        include: { space: { select: { name: true } } },
        orderBy: { startAt: 'asc' },
        take: 12,
      }),
      this.prisma.venuePipelineLead.findMany({
        where: {
          tenantId,
          venueSlug: slug,
          stage: { notIn: ['confirmado', 'perdido'] },
        },
        select: {
          id: true,
          contactName: true,
          companyName: true,
          stage: true,
          source: true,
          updatedAt: true,
        },
        orderBy: [{ updatedAt: 'asc' }, { createdAt: 'asc' }],
        take: 8,
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

    const upcomingBookings = upcomingBookingRows.map((row) => ({
      id: row.id,
      title: row.title,
      startAt: row.startAt.toISOString(),
      endAt: row.endAt.toISOString(),
      status: row.status,
      eventType: row.eventType,
      guestCount: row.guestCount,
      contactName: row.contactName,
      spaceName: row.space?.name,
    }));

    const leadsNeedingAttention = attentionLeadRows.map((row) => ({
      id: row.id,
      contactName: row.contactName,
      companyName: row.companyName,
      stage: row.stage,
      source: row.source,
      updatedAt: row.updatedAt.toISOString(),
    }));

    return {
      spacesCount,
      bookingsToday,
      upcomingBookingsTotal,
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
      upcomingBookings,
      leadsNeedingAttention,
    };
  }

  async listSpaces(venueSlug = BCH_VENUE_SLUG): Promise<VenueSpaceDto[]> {
    await this.ensureDefaultSpaces(venueSlug);
    const { tenantId, venueSlug: slug } = await this.resolveVenueContext(venueSlug);
    const rows = await this.prisma.venueSpace.findMany({
      where: { tenantId, venueSlug: slug, active: true },
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
    const { tenantId, venueSlug: slug } = await this.resolveVenueContext(venueSlug);
    const where: Record<string, unknown> = { tenantId, venueSlug: slug };
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
    const { tenantId, venueSlug: slug } = await this.resolveVenueContext(venueSlug);
    const status = dto.status ?? 'hold';
    assertBookingStatus(status);
    const startAt = parseDateTimeBrazil(dto.startAt);
    const endAt = parseDateTimeBrazil(dto.endAt);
    if (!startAt || !endAt || endAt <= startAt) {
      throw new BadRequestException('Datas inválidas');
    }

    const space = await this.prisma.venueSpace.findFirst({
      where: { id: dto.spaceId, tenantId, venueSlug: slug, active: true },
    });
    if (!space) throw new NotFoundException('Espaço não encontrado');

    const row = await this.prisma.venueBooking.create({
      data: {
        tenantId,
        venueSlug: slug,
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
    const { tenantId } = await this.resolveVenueContext(BCH_VENUE_SLUG);
    const existing = await this.prisma.venueBooking.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Reserva não encontrada');

    if (dto.status) assertBookingStatus(dto.status);
    const data: Record<string, unknown> = {};
    if (dto.spaceId !== undefined) {
      const space = await this.prisma.venueSpace.findFirst({
        where: { id: dto.spaceId, tenantId, active: true },
      });
      if (!space) throw new NotFoundException('Espaço não encontrado');
      data.spaceId = dto.spaceId;
    }
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.eventType !== undefined) data.eventType = dto.eventType.trim() || null;
    if (dto.startAt !== undefined) data.startAt = parseDateTimeBrazil(dto.startAt);
    if (dto.endAt !== undefined) data.endAt = parseDateTimeBrazil(dto.endAt);
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
    const { tenantId } = await this.resolveVenueContext(BCH_VENUE_SLUG);
    const existing = await this.prisma.venueBooking.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Reserva não encontrada');
    await this.prisma.venueBooking.delete({ where: { id } });
  }

  async listPipeline(
    filters: {
      venueSlug?: string;
      stage?: string;
      source?: string;
      q?: string;
      createdFrom?: string;
      createdTo?: string;
      commercialStatus?: string;
      sort?: string;
    } = {},
  ): Promise<VenuePipelineLeadDto[]> {
    const venueSlug = filters.venueSlug ?? BCH_VENUE_SLUG;
    const { tenantId, venueSlug: slug } = await this.resolveVenueContext(venueSlug);

    const where: Record<string, unknown> = { tenantId, venueSlug: slug };

    if (filters.source?.trim()) {
      where.source = filters.source.trim();
    }

    const commercial = filters.commercialStatus?.trim().toLowerCase();
    if (filters.stage?.trim()) {
      where.stage = filters.stage.trim();
    } else if (commercial === 'open') {
      where.stage = { notIn: ['confirmado', 'perdido'] };
    } else if (commercial === 'won') {
      where.stage = 'confirmado';
    } else if (commercial === 'lost') {
      where.stage = 'perdido';
    } else if (commercial === 'closed') {
      where.stage = { in: ['confirmado', 'perdido'] };
    }

    if (filters.createdFrom?.trim() || filters.createdTo?.trim()) {
      where.createdAt = {};
      if (filters.createdFrom?.trim()) {
        const from = parseDateOnlyBrazil(filters.createdFrom.trim());
        if (from) (where.createdAt as Record<string, Date>).gte = from;
      }
      if (filters.createdTo?.trim()) {
        const to = parseDateOnlyBrazil(filters.createdTo.trim());
        if (to) {
          const end = new Date(to);
          end.setHours(23, 59, 59, 999);
          (where.createdAt as Record<string, Date>).lte = end;
        }
      }
    }

    const q = filters.q?.trim();
    if (q) {
      where.OR = [
        { contactName: { contains: q, mode: 'insensitive' } },
        { contactEmail: { contains: q, mode: 'insensitive' } },
        { companyName: { contains: q, mode: 'insensitive' } },
        { contactPhone: { contains: q, mode: 'insensitive' } },
      ];
    }

    let orderBy: { updatedAt?: 'asc' | 'desc'; createdAt?: 'asc' | 'desc' } = {
      updatedAt: 'desc',
    };
    switch (filters.sort?.trim()) {
      case 'updatedAsc':
        orderBy = { updatedAt: 'asc' };
        break;
      case 'createdDesc':
        orderBy = { createdAt: 'desc' };
        break;
      case 'createdAsc':
        orderBy = { createdAt: 'asc' };
        break;
      case 'updatedDesc':
      default:
        orderBy = { updatedAt: 'desc' };
        break;
    }

    const rows = await this.prisma.venuePipelineLead.findMany({
      where,
      include: {
        booking: { include: { space: { select: { name: true } } } },
      },
      orderBy,
    });
    return rows.map(toLeadDto);
  }

  async getPipelineLead(id: string, venueSlug = BCH_VENUE_SLUG): Promise<VenuePipelineLeadDto> {
    const { tenantId, venueSlug: slug } = await this.resolveVenueContext(venueSlug);
    const row = await this.prisma.venuePipelineLead.findFirst({
      where: { id, tenantId, venueSlug: slug },
      include: {
        booking: { include: { space: { select: { name: true } } } },
      },
    });
    if (!row) throw new NotFoundException('Lead não encontrado');
    return toLeadDto(row);
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
    const { tenantId, venueSlug: slug } = await this.resolveVenueContext(venueSlug);
    const stage = dto.stage ?? 'lead';
    assertPipelineStage(stage);

    const row = await this.prisma.venuePipelineLead.create({
      data: {
        tenantId,
        venueSlug: slug,
        contactName: dto.contactName.trim(),
        contactEmail: dto.contactEmail.trim(),
        contactPhone: dto.contactPhone?.trim() || null,
        companyName: dto.companyName?.trim() || null,
        eventType: dto.eventType?.trim() || null,
        guestCount: dto.guestCount ?? null,
        preferredDate: dto.preferredDate ? parseDateOnlyBrazil(dto.preferredDate) : null,
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
    const { tenantId } = await this.resolveVenueContext(BCH_VENUE_SLUG);
    const existing = await this.prisma.venuePipelineLead.findFirst({
      where: { id, tenantId },
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
      data.preferredDate = dto.preferredDate ? parseDateOnlyBrazil(dto.preferredDate) : null;
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
