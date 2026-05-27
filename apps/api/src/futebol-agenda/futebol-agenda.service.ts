import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import {
  FOOTBALL_AGENDA_ENTRY_STATUSES,
  FOOTBALL_AGENDA_ENTRY_TYPES,
  type FootballAgendaCalendarItemDto,
  type FootballAgendaEntryDto,
  type FootballAgendaOverviewDto,
} from './futebol-agenda.constants';

function toEntryDto(row: {
  id: string;
  tenantId: string;
  category: string | null;
  type: string;
  title: string;
  startAt: Date;
  endAt: Date | null;
  allDay: boolean;
  location: string | null;
  description: string | null;
  status: string;
  travelLogisticsId: string | null;
  createdAt: Date;
  updatedAt: Date;
  tenant?: { name: string } | null;
}): FootballAgendaEntryDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    tenantName: row.tenant?.name,
    category: row.category,
    type: row.type,
    title: row.title,
    startAt: row.startAt.toISOString(),
    endAt: row.endAt?.toISOString() ?? null,
    allDay: row.allDay,
    location: row.location,
    description: row.description,
    status: row.status,
    travelLogisticsId: row.travelLogisticsId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class FutebolAgendaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
  ) {}

  private async ensureClubTenant(tenantId: string) {
    const tenant = await this.tenants.findOne(tenantId);
    const kindName = (tenant as { kind?: { name?: string } }).kind?.name;
    if (!kindName) throw new BadRequestException('Tenant sem tipo definido');
    const k = kindName.toLowerCase();
    const isClub =
      k.includes('futebol') || k.includes('clube') || k.includes('football');
    if (
      !isClub ||
      k.includes('construtora') ||
      k.includes('real estate') ||
      k.includes('construção')
    ) {
      throw new BadRequestException(
        'Agenda operacional é disponível apenas para clubes de futebol',
      );
    }
  }

  private assertEntryType(type: string) {
    if (!FOOTBALL_AGENDA_ENTRY_TYPES.includes(type as (typeof FOOTBALL_AGENDA_ENTRY_TYPES)[number])) {
      throw new BadRequestException(`Tipo inválido: ${type}`);
    }
  }

  private assertEntryStatus(status: string) {
    if (!FOOTBALL_AGENDA_ENTRY_STATUSES.includes(status as (typeof FOOTBALL_AGENDA_ENTRY_STATUSES)[number])) {
      throw new BadRequestException(`Status inválido: ${status}`);
    }
  }

  async getCalendar(filters: {
    from: string;
    to: string;
    tenantId?: string;
    types?: string;
  }): Promise<FootballAgendaCalendarItemDto[]> {
    const from = new Date(filters.from);
    const to = new Date(filters.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Período inválido');
    }

    const typeFilter = filters.types
      ? filters.types.split(',').map((t) => t.trim()).filter(Boolean)
      : null;

    const travelWhere: Record<string, unknown> = {
      status: { not: 'cancelado' },
      matchDate: { gte: from, lte: to },
    };
    const entryWhere: Record<string, unknown> = {
      status: { not: 'cancelado' },
      startAt: { gte: from, lte: to },
    };
    if (filters.tenantId) {
      travelWhere.tenantId = filters.tenantId;
      entryWhere.tenantId = filters.tenantId;
    }

    const includeTravel = !typeFilter || typeFilter.includes('viagem');
    const entryTypes = typeFilter?.filter((t) => t !== 'viagem') ?? null;

    const [travels, entries] = await Promise.all([
      includeTravel
        ? this.prisma.travelLogistics.findMany({
            where: travelWhere,
            include: { tenant: { select: { id: true, name: true } } },
            orderBy: { matchDate: 'asc' },
          })
        : [],
      this.prisma.footballAgendaEntry.findMany({
        where: {
          ...entryWhere,
          ...(entryTypes?.length ? { type: { in: entryTypes } } : {}),
        },
        include: { tenant: { select: { id: true, name: true } } },
        orderBy: { startAt: 'asc' },
      }),
    ]);

    const items: FootballAgendaCalendarItemDto[] = [];

    for (const t of travels) {
      const title = t.opponentName
        ? `Jogo fora — ${t.opponentName}`
        : t.championshipName ?? 'Viagem';
      const start = t.estimatedDeparture ?? t.matchDate;
      items.push({
        id: `travel-${t.id}`,
        source: 'travel',
        type: 'viagem',
        title,
        startAt: start.toISOString(),
        endAt: t.matchDate.toISOString(),
        allDay: !t.estimatedDeparture,
        tenantId: t.tenantId,
        tenantName: t.tenant.name,
        category: t.category,
        status: t.status,
        location: [t.city, t.country].filter(Boolean).join(', ') || t.stadiumName,
        opponentName: t.opponentName,
        championshipName: t.championshipName,
        href: `/dashboard/futebol/logistica/${t.id}/edit`,
      });
    }

    for (const e of entries) {
      items.push({
        id: `entry-${e.id}`,
        source: 'entry',
        type: e.type,
        title: e.title,
        startAt: e.startAt.toISOString(),
        endAt: e.endAt?.toISOString() ?? null,
        allDay: e.allDay,
        tenantId: e.tenantId,
        tenantName: e.tenant.name,
        category: e.category,
        status: e.status,
        location: e.location,
        href: `/dashboard/futebol/logistica/agenda?entry=${e.id}`,
      });
    }

    items.sort((a, b) => a.startAt.localeCompare(b.startAt));
    return items;
  }

  async getOverview(filters: {
    year: number;
    month: number;
    tenantId?: string;
  }): Promise<FootballAgendaOverviewDto> {
    const monthStart = new Date(filters.year, filters.month, 1);
    const monthEnd = new Date(filters.year, filters.month + 1, 0, 23, 59, 59);
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const items = await this.getCalendar({
      from: monthStart.toISOString(),
      to: monthEnd.toISOString(),
      tenantId: filters.tenantId,
    });

    const byType: Record<string, number> = {};
    let travelsInMonth = 0;
    let entriesInMonth = 0;
    let upcomingSevenDays = 0;

    for (const item of items) {
      byType[item.type] = (byType[item.type] ?? 0) + 1;
      if (item.source === 'travel') travelsInMonth++;
      else entriesInMonth++;
      const start = new Date(item.startAt);
      if (start >= now && start <= weekEnd) upcomingSevenDays++;
    }

    return {
      travelsInMonth,
      entriesInMonth,
      upcomingSevenDays,
      byType,
    };
  }

  async listEntries(tenantId?: string): Promise<FootballAgendaEntryDto[]> {
    const rows = await this.prisma.footballAgendaEntry.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: { tenant: { select: { name: true } } },
      orderBy: { startAt: 'desc' },
      take: 200,
    });
    return rows.map(toEntryDto);
  }

  async findEntry(id: string): Promise<FootballAgendaEntryDto> {
    const row = await this.prisma.footballAgendaEntry.findUnique({
      where: { id },
      include: { tenant: { select: { name: true } } },
    });
    if (!row) throw new NotFoundException('Compromisso não encontrado');
    return toEntryDto(row);
  }

  async createEntry(dto: {
    tenantId: string;
    category?: string;
    type: string;
    title: string;
    startAt: string;
    endAt?: string;
    allDay?: boolean;
    location?: string;
    description?: string;
    status?: string;
    travelLogisticsId?: string;
  }): Promise<FootballAgendaEntryDto> {
    await this.ensureClubTenant(dto.tenantId);
    this.assertEntryType(dto.type);
    const status = dto.status ?? 'confirmado';
    this.assertEntryStatus(status);

    const startAt = new Date(dto.startAt);
    const endAt = dto.endAt ? new Date(dto.endAt) : null;
    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('Data/hora inicial inválida');
    }
    if (endAt && Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('Data/hora final inválida');
    }

    const row = await this.prisma.footballAgendaEntry.create({
      data: {
        tenantId: dto.tenantId,
        category: dto.category?.trim() || null,
        type: dto.type,
        title: dto.title.trim(),
        startAt,
        endAt,
        allDay: dto.allDay ?? false,
        location: dto.location?.trim() || null,
        description: dto.description?.trim() || null,
        status,
        travelLogisticsId: dto.travelLogisticsId || null,
      },
      include: { tenant: { select: { name: true } } },
    });
    return toEntryDto(row);
  }

  async updateEntry(
    id: string,
    dto: Partial<{
      category: string;
      type: string;
      title: string;
      startAt: string;
      endAt: string | null;
      allDay: boolean;
      location: string;
      description: string;
      status: string;
    }>,
  ): Promise<FootballAgendaEntryDto> {
    const existing = await this.prisma.footballAgendaEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Compromisso não encontrado');
    if (dto.type) this.assertEntryType(dto.type);
    if (dto.status) this.assertEntryStatus(dto.status);

    const data: Record<string, unknown> = {};
    if (dto.category !== undefined) data.category = dto.category.trim() || null;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.startAt !== undefined) data.startAt = new Date(dto.startAt);
    if (dto.endAt !== undefined) data.endAt = dto.endAt ? new Date(dto.endAt) : null;
    if (dto.allDay !== undefined) data.allDay = dto.allDay;
    if (dto.location !== undefined) data.location = dto.location.trim() || null;
    if (dto.description !== undefined) data.description = dto.description.trim() || null;
    if (dto.status !== undefined) data.status = dto.status;

    const row = await this.prisma.footballAgendaEntry.update({
      where: { id },
      data,
      include: { tenant: { select: { name: true } } },
    });
    return toEntryDto(row);
  }

  async deleteEntry(id: string): Promise<void> {
    const existing = await this.prisma.footballAgendaEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Compromisso não encontrado');
    await this.prisma.footballAgendaEntry.delete({ where: { id } });
  }
}
