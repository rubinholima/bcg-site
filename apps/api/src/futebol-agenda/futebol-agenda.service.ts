import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
import {
  BRAZIL_TZ,
  addDaysToDateKey,
  compareAgendaCalendarItems,
  dateKeyInBrazil,
  formatTimeBrazil,
  parseDateOnlyBrazil,
  parseDateTimeBrazil,
  parsePeriodBrazil,
} from '../common/brazil-time.util';
import { FootballActivitySpacesService } from './football-activity-spaces.service';
import { travelMatchesCategoryFilter, parseTravelCategories } from './travel-categories.util';
import { normalizeTeamNameKeyForMerge } from '../public/visiting-team-logo-merge.util';
import {
  buildTravelMatchKey,
  dedupeTravelLogisticsList,
} from '../logistica/travel-logistics-dedup.util';
import {
  FRIENDLY_CHAMPIONSHIP_NAME,
  inferIsHomeFromJogoTitle,
  parseOpponentFromJogoTitle,
} from './friendly-match.util';

const entryInclude = {
  tenant: { select: { name: true } },
  space: { select: { id: true, name: true } },
  participants: { select: { playerId: true } },
} as const;

type TravelWithTenant = Prisma.TravelLogisticsGetPayload<{
  include: { tenant: { select: { id: true; name: true } } };
}>;

function resolveIsOurTeamHome(
  type: string,
  title: string,
  tenantName: string | undefined,
  meta: unknown,
): boolean | null {
  if (type !== 'jogo' && type !== 'viagem') return null;

  const m = meta as {
    isOurTeamHome?: boolean;
    isHomeMatch?: boolean;
    homeName?: string;
    awayName?: string;
  } | null;

  if (typeof m?.isOurTeamHome === 'boolean') return m.isOurTeamHome;
  if (typeof m?.isHomeMatch === 'boolean') return m.isHomeMatch;

  const tenantKey = normalizeTeamNameKeyForMerge(tenantName ?? '');
  if (tenantKey && m?.homeName) {
    const homeKey = normalizeTeamNameKeyForMerge(m.homeName);
    if (homeKey && (homeKey.includes(tenantKey) || tenantKey.includes(homeKey))) {
      return true;
    }
  }
  if (tenantKey && m?.awayName) {
    const awayKey = normalizeTeamNameKeyForMerge(m.awayName);
    if (awayKey && (awayKey.includes(tenantKey) || tenantKey.includes(awayKey))) {
      return false;
    }
  }

  const parts = title.match(/^(.+?)\s+x\s+(.+)$/i);
  if (parts && tenantKey) {
    const homeKey = normalizeTeamNameKeyForMerge(parts[1] ?? '');
    const awayKey = normalizeTeamNameKeyForMerge(parts[2] ?? '');
    if (homeKey && (homeKey.includes(tenantKey) || tenantKey.includes(homeKey))) return true;
    if (awayKey && (awayKey.includes(tenantKey) || tenantKey.includes(awayKey))) return false;
  }

  if (/^casa\b/i.test(title.trim())) return true;
  if (/^fora\b/i.test(title.trim())) return false;

  return null;
}

function parseHomeMatchAgendaItems(raw: unknown): Array<{
  id: string;
  date: string | null;
  label: string;
  time: string | null;
  notes: string | null;
}> {
  if (!raw || typeof raw !== 'object') return [];
  const itinerary = raw as Record<string, unknown>;
  if (!Array.isArray(itinerary.homeMatchAgenda)) return [];
  return itinerary.homeMatchAgenda
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map((s, i) => ({
      id: typeof s.id === 'string' ? s.id : `h-${i}`,
      date:
        typeof s.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.date.trim())
          ? s.date.trim()
          : null,
      label: typeof s.label === 'string' ? s.label.trim() : '',
      time: typeof s.time === 'string' ? s.time.trim() : null,
      notes: typeof s.notes === 'string' ? s.notes.trim() : null,
    }))
    .filter((s) => s.label.length > 0);
}

/** Monta instante em Brasília a partir de YYYY-MM-DD + HH:mm (fallback meio-dia se sem hora). */
function combineDateAndTime(
  dateKey: string,
  time: string | null | undefined,
): { start: Date; allDay: boolean } {
  const key = dateKey.trim().slice(0, 10);
  const timeMatch = (time ?? '').match(/^(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    const hh = String(Number(timeMatch[1])).padStart(2, '0');
    const mm = timeMatch[2];
    return {
      start: new Date(`${key}T${hh}:${mm}:00-03:00`),
      allDay: false,
    };
  }
  return {
    start: parseDateOnlyBrazil(key),
    allDay: true,
  };
}

function isDateKeyInRange(dateKey: string, from: Date, to: Date): boolean {
  const key = dateKey.slice(0, 10);
  const fromK = dateKeyInBrazil(from);
  const toK = dateKeyInBrazil(to);
  return key >= fromK && key <= toK;
}

function opponentFromJogoTitle(title: string): string | null {
  const m = title.match(/^(?:Casa|Fora|Jogo em casa|Jogo fora)\s*[—–-]\s*(.+)$/i);
  return m?.[1]?.trim() ?? null;
}

function toEntryDto(row: {
  id: string;
  tenantId: string;
  category: string | null;
  type: string;
  title: string;
  startAt: Date;
  endAt: Date | null;
  allDay: boolean;
  dayPeriod?: string | null;
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
    dayPeriod: row.dayPeriod ?? null,
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
    excludeBirthdays?: boolean;
  }): Promise<FootballAgendaCalendarItemDto[]> {
    const fromKey = filters.from.trim().slice(0, 10);
    const toKey = filters.to.trim().slice(0, 10);
    const range =
      /^\d{4}-\d{2}-\d{2}$/.test(fromKey) && /^\d{4}-\d{2}-\d{2}$/.test(toKey)
        ? parsePeriodBrazil(fromKey, toKey)
        : { from: new Date(filters.from), to: new Date(filters.to) };
    const { from, to } = range;
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Período inválido');
    }

    const typeFilter = filters.types
      ? filters.types.split(',').map((t) => t.trim()).filter(Boolean)
      : null;
    const excludeBirthdays = filters.excludeBirthdays === true;

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

    const includeTravelMatch =
      !typeFilter || typeFilter.includes('viagem') || typeFilter.includes('jogo');
    const includeTravelAgendaItems =
      !typeFilter ||
      typeFilter.includes('compromisso') ||
      typeFilter.includes('preparacao') ||
      typeFilter.includes('jogo') ||
      typeFilter.includes('viagem');
    const includeTravel = includeTravelMatch || includeTravelAgendaItems;
    const includePalco = !typeFilter || typeFilter.includes('palco');
    let entryTypeList =
      typeFilter?.filter((t) => t !== 'viagem' && t !== 'palco') ?? null;
    if (excludeBirthdays) {
      if (entryTypeList?.length) {
        entryTypeList = entryTypeList.filter((t) => t !== 'aniversario');
      }
    }
    const includeEntries =
      !typeFilter || (entryTypeList != null && entryTypeList.length > 0);
    const categoryFilter = filters.category?.trim() || null;

    // Amplia busca de viagens: agenda do jogo pode ter itens em D-1 / D-2
    const travelPadMs = 7 * 24 * 60 * 60 * 1000;
    const travelFrom = new Date(from.getTime() - travelPadMs);
    const travelTo = new Date(to.getTime() + travelPadMs);
    if (includeTravel) {
      travelWhere.matchDate = { gte: travelFrom, lte: travelTo };
    }

    const [travelsRaw, entries, bchBookings] = await Promise.all([
      includeTravel
        ? this.prisma.travelLogistics.findMany({
            where: travelWhere,
            include: { tenant: { select: { id: true, name: true } } },
            orderBy: { matchDate: 'asc' },
          })
        : Promise.resolve([] as TravelWithTenant[]),
      includeEntries
        ? this.prisma.footballAgendaEntry.findMany({
            where: {
              ...entryWhere,
              ...(entryTypeList?.length
                ? { type: { in: entryTypeList } }
                : excludeBirthdays
                  ? { type: { not: 'aniversario' } }
                  : {}),
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

    const travelsRawDeduped = categoryFilter
      ? travelsRaw.filter((t) =>
          travelMatchesCategoryFilter(
            { category: t.category, categories: t.categories },
            categoryFilter,
          ),
        )
      : travelsRaw;

    const travels = dedupeTravelLogisticsList(travelsRawDeduped);

    const travelIdsInCalendar = new Set(travels.map((t) => t.id));
    const travelMatchKeys = new Set(
      travels.map((t) => buildTravelMatchKey(t.tenantId, t.matchDate, t.opponentName, t.category)),
    );

    const items: FootballAgendaCalendarItemDto[] = [];

    for (const t of travels) {
      const isHome = t.isHomeMatch === true;
      const calendarType = isHome ? 'jogo' : 'viagem';
      const matchAt = t.matchDate;
      const matchDateKey = dateKeyInBrazil(matchAt);
      const rangeFromKey = dateKeyInBrazil(from);
      const rangeToKey = dateKeyInBrazil(to);
      const matchInRange = matchDateKey >= rangeFromKey && matchDateKey <= rangeToKey;
      const travelCats = parseTravelCategories(t.categories);
      const location =
        [t.stadiumName, t.city, t.country].filter(Boolean).join(' · ') || null;

      if (
        includeTravelMatch &&
        matchInRange &&
        (!typeFilter || typeFilter.includes(calendarType))
      ) {
        const title = t.opponentName
          ? isHome
            ? `Jogo em casa — ${t.opponentName}`
            : `Jogo fora — ${t.opponentName}`
          : isHome
            ? t.championshipName ?? 'Jogo em casa'
            : t.championshipName ?? 'Viagem';
        const departureAt = t.estimatedDeparture;
        const start = matchAt;
        const matchTime = formatTimeBrazil(matchAt);
        const hasClock =
          Boolean(departureAt) ||
          (matchTime !== '12:00' && matchTime !== '00:00');
        items.push({
          id: `travel-${t.id}`,
          source: 'travel',
          type: calendarType,
          title,
          startAt: start.toISOString(),
          endAt: matchAt.toISOString(),
          allDay: !hasClock,
          tenantId: t.tenantId,
          tenantName: t.tenant.name,
          category: t.category,
          categories: travelCats.length > 0 ? travelCats : undefined,
          status: t.status,
          location,
          opponentName: t.opponentName,
          championshipName: t.championshipName,
          isOurTeamHome: isHome,
          href: `/dashboard/futebol/logistica/${t.id}/edit`,
        });
      }

      if (!includeTravelAgendaItems) continue;
      if (
        typeFilter &&
        !typeFilter.includes('compromisso') &&
        !typeFilter.includes('preparacao') &&
        !typeFilter.includes('jogo') &&
        !typeFilter.includes('viagem')
      ) {
        continue;
      }

      const agendaItems = parseHomeMatchAgendaItems(t.itinerary);
      for (const agenda of agendaItems) {
        const dateKey = agenda.date || matchDateKey;
        if (!isDateKeyInRange(dateKey, from, to)) continue;
        const { start, allDay } = combineDateAndTime(dateKey, agenda.time);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const itemType =
          dateKey < matchDateKey ? 'preparacao' : 'compromisso';
        if (
          typeFilter &&
          !typeFilter.includes(itemType) &&
          !typeFilter.includes('jogo') &&
          !typeFilter.includes('viagem')
        ) {
          continue;
        }
        items.push({
          id: `travel-${t.id}-agenda-${agenda.id}`,
          source: 'travel',
          type: itemType,
          title: agenda.label,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          allDay,
          tenantId: t.tenantId,
          tenantName: t.tenant.name,
          category: t.category,
          categories: travelCats.length > 0 ? travelCats : undefined,
          status: t.status,
          location: agenda.notes || location,
          opponentName: t.opponentName,
          championshipName: t.championshipName,
          isOurTeamHome: isHome,
          href: `/dashboard/futebol/logistica/${t.id}/edit`,
        });
      }
    }

    for (const e of entries) {
      if (e.type === 'jogo') {
        if (e.travelLogisticsId && travelIdsInCalendar.has(e.travelLogisticsId)) {
          continue;
        }
        const opp = opponentFromJogoTitle(e.title);
        const entryMatchKey = buildTravelMatchKey(e.tenantId, e.startAt, opp, e.category);
        if (travelMatchKeys.has(entryMatchKey)) {
          continue;
        }
      }

      const isOurTeamHome = resolveIsOurTeamHome(
        e.type,
        e.title,
        e.tenant.name,
        e.beatscodeMeta,
      );
      items.push({
        id: `entry-${e.id}`,
        source: 'entry',
        type: e.type,
        title: e.title,
        startAt: e.startAt.toISOString(),
        endAt: e.endAt?.toISOString() ?? null,
        allDay: e.allDay,
        dayPeriod: e.dayPeriod ?? null,
        tenantId: e.tenantId,
        tenantName: e.tenant.name,
        category: e.category,
        status: e.status,
        location: displayLocation(e),
        spaceId: e.spaceId,
        spaceName: e.space?.name ?? null,
        externalId: e.externalId,
        agendaLocked: e.agendaLocked,
        championshipName:
          typeof (e.beatscodeMeta as { competitionName?: string } | null)?.competitionName ===
          'string'
            ? (e.beatscodeMeta as { competitionName: string }).competitionName
            : null,
        isOurTeamHome,
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
        isOurTeamHome: null,
        href: `/dashboard/eventos/boston-city-hall/reservas?edit=${b.id}`,
      });
    }

    items.sort((a, b) =>
      compareAgendaCalendarItems(
        {
          type: a.type,
          startAt: a.startAt,
          allDay: a.allDay,
          dayPeriod: a.dayPeriod,
        },
        {
          type: b.type,
          startAt: b.startAt,
          allDay: b.allDay,
          dayPeriod: b.dayPeriod,
        },
      ),
    );
    return items;
  }

  async getOverview(filters: {
    year: number;
    month: number;
    tenantId?: string;
    category?: string;
    excludeBirthdays?: boolean;
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
      excludeBirthdays: filters.excludeBirthdays,
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
    dayPeriod?: string | null;
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

    const startAt = parseDateTimeBrazil(dto.startAt);
    const endAt = dto.endAt ? parseDateTimeBrazil(dto.endAt) : null;
    if (!startAt) {
      throw new BadRequestException('Data/hora inicial inválida');
    }
    if (dto.endAt && !endAt) {
      throw new BadRequestException('Data/hora final inválida');
    }

    const category = dto.category?.trim() || null;
    const spaceId = dto.spaceId?.trim() || null;
    const dayPeriod =
      dto.dayPeriod === 'manha' || dto.dayPeriod === 'tarde' || dto.dayPeriod === 'noite'
        ? dto.dayPeriod
        : null;

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
        dayPeriod,
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
      dayPeriod: string | null;
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

    const startAt =
      dto.startAt !== undefined ? parseDateTimeBrazil(dto.startAt) ?? existing.startAt : existing.startAt;
    const endAt =
      dto.endAt !== undefined
        ? dto.endAt
          ? parseDateTimeBrazil(dto.endAt)
          : null
        : existing.endAt;
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
    if (dto.dayPeriod !== undefined) {
      data.dayPeriod =
        dto.dayPeriod === 'manha' || dto.dayPeriod === 'tarde' || dto.dayPeriod === 'noite'
          ? dto.dayPeriod
          : null;
    }
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

  /** 0=Dom … 6=Sáb — alinhado ao calendário da UI. */
  private weekdayBrazil(dateKey: string): number {
    const d = parseDateOnlyBrazil(dateKey.slice(0, 10));
    if (Number.isNaN(d.getTime())) return 0;
    const wd = new Intl.DateTimeFormat('en-US', {
      timeZone: BRAZIL_TZ,
      weekday: 'short',
    }).format(d);
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return map[wd] ?? d.getUTCDay();
  }

  private shiftEntryTimes(
    entry: {
      startAt: Date;
      endAt: Date | null;
      allDay: boolean;
      dayPeriod: string | null;
    },
    targetDateKey: string,
  ): { startAt: Date; endAt: Date | null } {
    const key = targetDateKey.slice(0, 10);
    if (entry.allDay || entry.dayPeriod) {
      const startAt = parseDateOnlyBrazil(key);
      if (!entry.endAt) return { startAt, endAt: null };
      const sourceStartKey = dateKeyInBrazil(entry.startAt);
      const sourceEndKey = dateKeyInBrazil(entry.endAt);
      const startMs = parseDateOnlyBrazil(sourceStartKey).getTime();
      const endMs = parseDateOnlyBrazil(sourceEndKey).getTime();
      const daySpan = Math.round((endMs - startMs) / (24 * 60 * 60 * 1000));
      const endAt =
        daySpan > 0 ? parseDateOnlyBrazil(addDaysToDateKey(key, daySpan)) : startAt;
      return { startAt, endAt };
    }

    const timeMatch = formatTimeBrazil(entry.startAt, false, null).match(/(\d{1,2}):(\d{2})/);
    const time = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : null;
    const { start: startAt } = combineDateAndTime(key, time);
    let endAt: Date | null = null;
    if (entry.endAt) {
      endAt = new Date(startAt.getTime() + (entry.endAt.getTime() - entry.startAt.getTime()));
    }
    return { startAt, endAt };
  }

  /**
   * Replica a programação de um dia nos demais dias da semana selecionados,
   * até a data limite (ex.: treinos de segunda repetidos ter–qui).
   */
  async repeatDayProgramming(dto: {
    tenantId: string;
    sourceDate: string;
    weekdays: number[];
    untilDate: string;
    category?: string;
    skipExisting?: boolean;
    allowConflict?: boolean;
  }): Promise<{
    created: number;
    skipped: number;
    sourceCount: number;
    targetDays: number;
    conflicts: string[];
  }> {
    await this.ensureClubTenant(dto.tenantId);
    await this.spaces.ensureDefaults(dto.tenantId);

    const sourceDate = dto.sourceDate.trim().slice(0, 10);
    const untilDate = dto.untilDate.trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sourceDate)) {
      throw new BadRequestException('Data base inválida');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(untilDate)) {
      throw new BadRequestException('Data limite inválida');
    }
    if (untilDate < sourceDate) {
      throw new BadRequestException('A data limite deve ser igual ou posterior à data base.');
    }

    const weekdays = [...new Set(dto.weekdays.filter((d) => d >= 0 && d <= 6))];
    if (weekdays.length === 0) {
      throw new BadRequestException('Selecione ao menos um dia da semana.');
    }

    const categoryFilter = dto.category?.trim() || null;
    const rangeStart = parseDateOnlyBrazil(sourceDate);
    const rangeEnd = parseDateOnlyBrazil(untilDate);
    rangeEnd.setUTCHours(23, 59, 59, 999);

    const sourceEntries = await this.prisma.footballAgendaEntry.findMany({
      where: {
        tenantId: dto.tenantId,
        status: { not: 'cancelado' },
        type: { notIn: ['jogo', 'aniversario'] },
        startAt: { gte: rangeStart, lte: new Date(`${sourceDate}T23:59:59-03:00`) },
        ...(categoryFilter ? { category: categoryFilter } : {}),
      },
      include: entryInclude,
      orderBy: [{ startAt: 'asc' }, { title: 'asc' }],
    });

    const sources = sourceEntries.filter(
      (row) => dateKeyInBrazil(row.startAt) === sourceDate,
    );
    if (sources.length === 0) {
      throw new BadRequestException(
        'Nenhum compromisso replicável neste dia (treinos, reuniões, etc.). Jogos e aniversários não entram.',
      );
    }

    const targetDateKeys: string[] = [];
    let cursor = sourceDate;
    while (cursor <= untilDate) {
      if (cursor !== sourceDate && weekdays.includes(this.weekdayBrazil(cursor))) {
        targetDateKeys.push(cursor);
      }
      cursor = addDaysToDateKey(cursor, 1);
    }
    if (targetDateKeys.length === 0) {
      throw new BadRequestException(
        'Nenhum dia alvo no período. Ajuste os dias da semana ou a data limite.',
      );
    }

    let created = 0;
    let skipped = 0;
    const conflicts: string[] = [];

    for (const targetDateKey of targetDateKeys) {
      for (const source of sources) {
        const externalId = `repeat:${source.id}:${targetDateKey}`;
        if (dto.skipExisting !== false) {
          const exists = await this.prisma.footballAgendaEntry.findFirst({
            where: { tenantId: dto.tenantId, externalId },
            select: { id: true },
          });
          if (exists) {
            skipped += 1;
            continue;
          }
        }

        const { startAt, endAt } = this.shiftEntryTimes(source, targetDateKey);

        try {
          await this.assertNoSpaceConflict({
            tenantId: dto.tenantId,
            spaceId: source.spaceId,
            category: source.category,
            type: source.type,
            startAt,
            endAt,
            allDay: source.allDay,
            allowConflict: dto.allowConflict,
          });
        } catch (e) {
          const msg =
            e instanceof BadRequestException
              ? (e.getResponse() as { message?: string | string[] }).message
              : null;
          const detail = Array.isArray(msg) ? msg.join(', ') : typeof msg === 'string' ? msg : 'Conflito';
          conflicts.push(`${targetDateKey} · ${source.title}: ${detail}`);
          skipped += 1;
          continue;
        }

        const row = await this.prisma.footballAgendaEntry.create({
          data: {
            tenantId: dto.tenantId,
            category: source.category,
            type: source.type,
            title: source.title,
            startAt,
            endAt,
            allDay: source.allDay,
            dayPeriod: source.dayPeriod,
            location: source.location,
            spaceId: source.spaceId,
            description: source.description,
            status: source.status,
            agendaLocked: true,
            externalId,
          },
        });

        const playerIds = source.participants?.map((p) => p.playerId) ?? [];
        if (playerIds.length > 0) {
          await this.syncParticipants(row.id, playerIds);
        }
        created += 1;
      }
    }

    return {
      created,
      skipped,
      sourceCount: sources.length,
      targetDays: targetDateKeys.length,
      conflicts,
    };
  }

  async ensureTravelForEntry(
    entryId: string,
    dto?: {
      opponentName?: string;
      isHomeMatch?: boolean;
      championshipName?: string;
    },
  ): Promise<{ entry: FootballAgendaEntryDto; travelId: string; created: boolean }> {
    const existing = await this.prisma.footballAgendaEntry.findUnique({
      where: { id: entryId },
      include: entryInclude,
    });
    if (!existing) throw new NotFoundException('Compromisso não encontrado');
    if (existing.type !== 'jogo') {
      throw new BadRequestException('Operação disponível apenas para compromissos do tipo jogo.');
    }

    if (existing.travelLogisticsId) {
      const linked = await this.prisma.travelLogistics.findFirst({
        where: { id: existing.travelLogisticsId, tenantId: existing.tenantId },
      });
      if (linked) {
        return {
          entry: toEntryDto(existing),
          travelId: linked.id,
          created: false,
        };
      }
    }

    const opponentName =
      dto?.opponentName?.trim() || parseOpponentFromJogoTitle(existing.title);
    if (!opponentName) {
      throw new BadRequestException('Informe o adversário para operar o jogo.');
    }

    const isHomeMatch =
      dto?.isHomeMatch ?? inferIsHomeFromJogoTitle(existing.title) ?? true;
    const championshipName =
      dto?.championshipName?.trim() || FRIENDLY_CHAMPIONSHIP_NAME;
    const matchDate =
      parseDateOnlyBrazil(dateKeyInBrazil(existing.startAt)) ?? existing.startAt;

    const travel = await this.prisma.travelLogistics.create({
      data: {
        tenantId: existing.tenantId,
        matchDate,
        opponentName,
        stadiumName: existing.location,
        category: existing.category,
        isHomeMatch,
        championshipName,
        status: 'planejamento',
        externalId: existing.externalId,
      },
    });

    await this.prisma.footballAgendaEntry.update({
      where: { id: entryId },
      data: { travelLogisticsId: travel.id, agendaLocked: true },
    });

    return {
      entry: await this.findEntry(entryId),
      travelId: travel.id,
      created: true,
    };
  }
}
