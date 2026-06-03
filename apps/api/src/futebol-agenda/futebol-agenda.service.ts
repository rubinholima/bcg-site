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
  type FootballAgendaConflictDto,
  type FootballAgendaEntryDto,
  type FootballAgendaOverviewDto,
} from './futebol-agenda.constants';
import { findSpaceConflicts } from './football-agenda-conflicts';
import { travelMatchesCategoryFilter, parseTravelCategories } from './travel-categories.util';
import { FootballActivitySpacesService } from './football-activity-spaces.service';

const entryInclude = {
  tenant: { select: { name: true } },
  space: { select: { id: true, name: true } },
  participants: { select: { playerId: true } },
} as const;

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
  spaceId?: string | null;
  description: string | null;
  status: string;
  travelLogisticsId: string | null;
  createdAt: Date;
  updatedAt: Date;
  externalId?: string | null;
  agendaLocked?: boolean;
  tenant?: { name: string } | null;
  space?: { id: string; name: string } | null;
  participants?: { playerId: string }[];
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
    spaceId: row.spaceId ?? null,
    spaceName: row.space?.name ?? null,
    description: row.description,
    status: row.status,
    travelLogisticsId: row.travelLogisticsId,
    playerIds: row.participants?.map((p) => p.playerId) ?? [],
    externalId: row.externalId ?? null,
    agendaLocked: row.agendaLocked ?? false,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function displayLocation(row: {
  location: string | null;
  space?: { name: string } | null;
}): string | null {
  return row.space?.name ?? row.location;
}

@Injectable()
export class FutebolAgendaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenants: TenantsService,
    private readonly spaces: FootballActivitySpacesService,
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
    category?: string;
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
    if (filters.category?.trim()) {
      entryWhere.category = filters.category.trim();
    }

    const includeTravel = !typeFilter || typeFilter.includes('viagem');
    const includePalco = !typeFilter || typeFilter.includes('palco');
    const entryTypeList =
      typeFilter?.filter((t) => t !== 'viagem' && t !== 'palco') ?? null;
    const includeEntries =
      !typeFilter || (entryTypeList != null && entryTypeList.length > 0);
    const categoryFilter = filters.category?.trim() || null;

    type TravelWithTenant = Awaited<
      ReturnType<
        typeof this.prisma.travelLogistics.findMany<{
          include: { tenant: { select: { id: true; name: true } } };
        }>
      >
    >;

    const [travelsRaw, entries, bchBookings] = await Promise.all([
      includeTravel
        ? this.prisma.travelLogistics.findMany({
            where: travelWhere,
            include: { tenant: { select: { id: true, name: true } } },
            orderBy: { matchDate: 'asc' },
          })
        : Promise.resolve([] as TravelWithTenant),
      includeEntries
        ? this.prisma.footballAgendaEntry.findMany({
            where: {
              ...entryWhere,
              ...(entryTypeList?.length ? { type: { in: entryTypeList } } : {}),
            },
            include: {
              tenant: { select: { id: true, name: true } },
              space: { select: { id: true, name: true } },
            },
            orderBy: { startAt: 'asc' },
          })
        : Promise.resolve([]),
      includePalco
        ? this.prisma.venueBooking.findMany({
            where: {
              venueSlug: 'boston-city-hall',
              status: { not: 'cancelled' },
              startAt: { lte: to },
              endAt: { gte: from },
            },
            include: { space: { select: { name: true } } },
            orderBy: { startAt: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    const travels = categoryFilter
      ? travelsRaw.filter((t) =>
          travelMatchesCategoryFilter(
            { category: t.category, categories: t.categories },
            categoryFilter,
          ),
        )
      : travelsRaw;

    const items: FootballAgendaCalendarItemDto[] = [];

    for (const t of travels) {
      const title = t.opponentName
        ? `Jogo fora — ${t.opponentName}`
        : t.championshipName ?? 'Viagem';
      const start = t.estimatedDeparture ?? t.matchDate;
      const travelCats = parseTravelCategories(t.categories);
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
        categories: travelCats.length > 0 ? travelCats : undefined,
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
        location: displayLocation(e),
        spaceId: e.spaceId,
        spaceName: e.space?.name ?? null,
        externalId: e.externalId,
        agendaLocked: e.agendaLocked,
        href: `/dashboard/futebol/logistica/agenda?entry=${e.id}`,
      });
    }

    for (const b of bchBookings) {
      items.push({
        id: `bch-${b.id}`,
        source: 'bch_booking',
        type: 'palco',
        title: b.title,
        startAt: b.startAt.toISOString(),
        endAt: b.endAt.toISOString(),
        allDay: false,
        tenantId: '',
        tenantName: 'Boston City Hall',
        category: null,
        status: b.status,
        location: b.space?.name ?? null,
        spaceName: b.space?.name ?? null,
        href: `/dashboard/eventos/boston-city-hall/reservas?edit=${b.id}`,
      });
    }

    items.sort((a, b) => a.startAt.localeCompare(b.startAt));
    return items;
  }

  async getOverview(filters: {
    year: number;
    month: number;
    tenantId?: string;
    category?: string;
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
      category: filters.category,
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
      include: entryInclude,
      orderBy: { startAt: 'desc' },
      take: 200,
    });
    return rows.map(toEntryDto);
  }

  async findEntry(id: string): Promise<FootballAgendaEntryDto> {
    const row = await this.prisma.footballAgendaEntry.findUnique({
      where: { id },
      include: entryInclude,
    });
    if (!row) throw new NotFoundException('Compromisso não encontrado');
    return toEntryDto(row);
  }

  async checkSpaceConflicts(input: {
    tenantId: string;
    spaceId: string;
    category?: string;
    startAt: string;
    endAt?: string | null;
    allDay?: boolean;
    excludeEntryId?: string;
  }): Promise<FootballAgendaConflictDto[]> {
    const startAt = new Date(input.startAt);
    const endAt = input.endAt ? new Date(input.endAt) : null;
    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('Data/hora inicial inválida');
    }

    const rows = await this.prisma.footballAgendaEntry.findMany({
      where: {
        tenantId: input.tenantId,
        spaceId: input.spaceId,
        status: { not: 'cancelado' },
      },
      select: {
        id: true,
        title: true,
        category: true,
        type: true,
        startAt: true,
        endAt: true,
        allDay: true,
      },
    });

    const conflicts = findSpaceConflicts(rows, {
      startAt,
      endAt,
      allDay: input.allDay ?? false,
      category: input.category?.trim() || null,
      excludeEntryId: input.excludeEntryId,
    });

    return conflicts.map((c) => ({
      id: c.id,
      title: c.title,
      category: c.category,
      type: c.type,
      startAt: c.startAt.toISOString(),
      endAt: c.endAt?.toISOString() ?? null,
    }));
  }

  private async assertNoSpaceConflict(input: {
    tenantId: string;
    spaceId: string | null | undefined;
    category: string | null;
    type: string;
    startAt: Date;
    endAt: Date | null;
    allDay: boolean;
    excludeEntryId?: string;
    allowConflict?: boolean;
  }) {
    if (!input.spaceId || input.type === 'aniversario') return;
    const conflicts = await this.checkSpaceConflicts({
      tenantId: input.tenantId,
      spaceId: input.spaceId,
      category: input.category ?? undefined,
      startAt: input.startAt.toISOString(),
      endAt: input.endAt?.toISOString(),
      allDay: input.allDay,
      excludeEntryId: input.excludeEntryId,
    });
    if (conflicts.length > 0 && !input.allowConflict) {
      const sample = conflicts[0];
      throw new BadRequestException(
        `Conflito de horário no espaço: "${sample.title}" (${sample.category ?? 'sem categoria'}) neste horário.`,
      );
    }
  }

  private async syncParticipants(entryId: string, playerIds?: string[]) {
    if (!playerIds) return;
    const unique = [...new Set(playerIds.filter(Boolean))];
    await this.prisma.footballAgendaEntryParticipant.deleteMany({ where: { entryId } });
    if (unique.length === 0) return;
    await this.prisma.footballAgendaEntryParticipant.createMany({
      data: unique.map((playerId) => ({ entryId, playerId })),
      skipDuplicates: true,
    });
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
    spaceId?: string;
    description?: string;
    status?: string;
    travelLogisticsId?: string;
    playerIds?: string[];
    allowConflict?: boolean;
  }): Promise<FootballAgendaEntryDto> {
    await this.ensureClubTenant(dto.tenantId);
    await this.spaces.ensureDefaults(dto.tenantId);
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

    const category = dto.category?.trim() || null;
    const spaceId = dto.spaceId?.trim() || null;

    await this.assertNoSpaceConflict({
      tenantId: dto.tenantId,
      spaceId,
      category,
      type: dto.type,
      startAt,
      endAt,
      allDay: dto.allDay ?? false,
      allowConflict: dto.allowConflict,
    });

    let location = dto.location?.trim() || null;
    if (spaceId) {
      const space = await this.prisma.footballActivitySpace.findFirst({
        where: { id: spaceId, tenantId: dto.tenantId, active: true },
      });
      if (!space) throw new BadRequestException('Espaço não encontrado');
      if (!location) location = space.name;
    }

    const row = await this.prisma.footballAgendaEntry.create({
      data: {
        tenantId: dto.tenantId,
        category,
        type: dto.type,
        title: dto.title.trim(),
        startAt,
        endAt,
        allDay: dto.allDay ?? false,
        location,
        spaceId,
        description: dto.description?.trim() || null,
        status,
        travelLogisticsId: dto.travelLogisticsId || null,
        agendaLocked: true,
      },
      include: entryInclude,
    });

    await this.syncParticipants(row.id, dto.playerIds);
    const fresh = await this.prisma.footballAgendaEntry.findUnique({
      where: { id: row.id },
      include: entryInclude,
    });
    return toEntryDto(fresh!);
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
      spaceId: string | null;
      description: string;
      status: string;
      playerIds: string[];
      allowConflict: boolean;
    }>,
  ): Promise<FootballAgendaEntryDto> {
    const existing = await this.prisma.footballAgendaEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Compromisso não encontrado');
    if (dto.type) this.assertEntryType(dto.type);
    if (dto.status) this.assertEntryStatus(dto.status);

    const startAt = dto.startAt !== undefined ? new Date(dto.startAt) : existing.startAt;
    const endAt =
      dto.endAt !== undefined ? (dto.endAt ? new Date(dto.endAt) : null) : existing.endAt;
    const allDay = dto.allDay !== undefined ? dto.allDay : existing.allDay;
    const category = dto.category !== undefined ? dto.category.trim() || null : existing.category;
    const spaceId = dto.spaceId !== undefined ? dto.spaceId?.trim() || null : existing.spaceId;
    const type = dto.type ?? existing.type;

    await this.assertNoSpaceConflict({
      tenantId: existing.tenantId,
      spaceId,
      category,
      type,
      startAt,
      endAt,
      allDay,
      excludeEntryId: id,
      allowConflict: dto.allowConflict,
    });

    const data: Record<string, unknown> = {};
    if (dto.category !== undefined) data.category = category;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.title !== undefined) data.title = dto.title.trim();
    if (dto.startAt !== undefined) data.startAt = startAt;
    if (dto.endAt !== undefined) data.endAt = endAt;
    if (dto.allDay !== undefined) data.allDay = allDay;
    if (dto.description !== undefined) data.description = dto.description.trim() || null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.spaceId !== undefined) {
      data.spaceId = spaceId;
      if (spaceId) {
        const space = await this.prisma.footballActivitySpace.findFirst({
          where: { id: spaceId, tenantId: existing.tenantId, active: true },
        });
        if (!space) throw new BadRequestException('Espaço não encontrado');
        if (dto.location === undefined && !existing.location) data.location = space.name;
      }
    }
    if (dto.location !== undefined) data.location = dto.location.trim() || null;
    data.agendaLocked = true;

    await this.prisma.footballAgendaEntry.update({ where: { id }, data });
    if (dto.playerIds !== undefined) await this.syncParticipants(id, dto.playerIds);
    return this.findEntry(id);
  }

  /** Compromissos + viagens vinculados ao atleta (ficha). */
  async findPlayerAgenda(playerId: string, from?: string, to?: string) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
      select: { id: true, tenantId: true, category: true, name: true },
    });
    if (!player) throw new NotFoundException('Jogador não encontrado');

    const now = new Date();
    const rangeFrom = from ? new Date(from) : now;
    const rangeTo = to ? new Date(to) : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    const [participantEntries, travels] = await Promise.all([
      this.prisma.footballAgendaEntry.findMany({
        where: {
          tenantId: player.tenantId,
          status: { not: 'cancelado' },
          startAt: { gte: rangeFrom, lte: rangeTo },
          participants: { some: { playerId } },
        },
        include: entryInclude,
        orderBy: { startAt: 'asc' },
      }),
      this.prisma.travelLogistics.findMany({
        where: {
          tenantId: player.tenantId,
          status: { notIn: ['rascunho', 'cancelado'] },
          matchDate: { gte: rangeFrom, lte: rangeTo },
        },
        include: { tenant: { select: { name: true } } },
        orderBy: { matchDate: 'asc' },
      }),
    ]);

    const travelItems = travels
      .filter(
        (t) =>
          this.travelIncludesPlayer(t.accommodationRooms, playerId) ||
          this.travelMatchesCategory(t.category, t.categories, player.category),
      )
      .map((t) => ({
        id: t.id,
        source: 'travel' as const,
        type: 'viagem',
        title: t.opponentName ? `Jogo fora — ${t.opponentName}` : t.championshipName ?? 'Viagem',
        startAt: (t.estimatedDeparture ?? t.matchDate).toISOString(),
        category: t.category,
        status: t.status,
        location: [t.city, t.country].filter(Boolean).join(', ') || t.stadiumName,
        href: `/dashboard/futebol/logistica/${t.id}/edit`,
      }));

    const entryItems = participantEntries.map((e) => ({
      id: e.id,
      source: 'entry' as const,
      type: e.type,
      title: e.title,
      startAt: e.startAt.toISOString(),
      endAt: e.endAt?.toISOString() ?? null,
      allDay: e.allDay,
      category: e.category,
      status: e.status,
      location: displayLocation(e),
      spaceName: e.space?.name ?? null,
      href: `/dashboard/futebol/logistica/agenda?entry=${e.id}`,
    }));

    return [...entryItems, ...travelItems].sort((a, b) => a.startAt.localeCompare(b.startAt));
  }

  private travelIncludesPlayer(rooms: unknown, playerId: string): boolean {
    if (!Array.isArray(rooms)) return false;
    for (const room of rooms) {
      if (!room || typeof room !== 'object') continue;
      const r = room as Record<string, unknown>;
      if (r.personType === 'player' && r.personId === playerId) return true;
      const occupants = r.occupants;
      if (!Array.isArray(occupants)) continue;
      for (const occ of occupants) {
        if (!occ || typeof occ !== 'object') continue;
        const o = occ as Record<string, unknown>;
        if (o.personType === 'player' && o.personId === playerId) return true;
      }
    }
    return false;
  }

  private travelMatchesCategory(
    travelCategory: string | null | undefined,
    travelCategories: unknown,
    playerCategory: string | null | undefined,
  ): boolean {
    if (!playerCategory) return false;
    const list = parseTravelCategories(travelCategories);
    if (list.length > 0) return list.includes(playerCategory);
    return travelMatchesCategoryFilter(
      { category: travelCategory ?? null, categories: travelCategories },
      playerCategory,
    );
  }

  async linkParticipants(entryId: string, playerIds: string[]) {
    await this.syncParticipants(entryId, playerIds);
  }

  async resolveSpaceForImport(tenantId: string, locationName: string | null) {
    return this.spaces.resolveByName(tenantId, locationName);
  }

  async deleteEntry(id: string): Promise<void> {
    const existing = await this.prisma.footballAgendaEntry.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Compromisso não encontrado');
    await this.prisma.footballAgendaEntry.delete({ where: { id } });
  }
}
