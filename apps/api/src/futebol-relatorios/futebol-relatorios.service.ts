import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FutebolAgendaService } from '../futebol-agenda/futebol-agenda.service';
import {
  FOOTBALL_AGENDA_TYPE_LABEL,
} from '../futebol-agenda/futebol-agenda.constants';
import {
  parseTravelCategories,
} from '../futebol-agenda/travel-categories.util';
import {
  isArchivedSportsSituation,
  isLoanedSportsSituation,
  normalizeSportsSituation,
} from '../common/sports-situation.util';
import {
  addDaysToDateKey,
  compareTimeLabels,
  dateKeyInBrazil,
  formatTimeBrazil,
} from '../common/brazil-time.util';
import {
  normalizeTeamNameKeyForMerge,
  softNormalizeTeamNameKey,
} from '../public/visiting-team-logo-merge.util';
import type {
  HospedesReportDto,
  LayoutRelacionadosReportDto,
  PassageirosReportDto,
  PressKitConfigDto,
  PressKitNamedRole,
  PressKitReportDto,
  PressKitUniformKitDto,
  ProgramacaoSemanalReportDto,
  RelatorioHospedeRow,
  RelatorioPessoaRow,
  RelatorioTravelMeta,
} from './futebol-relatorios.types';
import {
  DEFAULT_PRESS_KIT_DIRECTOR_ROLES,
  DEFAULT_PRESS_KIT_REFEREE_ROLES,
} from './futebol-relatorios.types';

const TRANSPORT_LABELS: Record<string, string> = {
  aereo_comercial: 'Aéreo comercial',
  aereo_fretado: 'Aéreo fretado',
  rodoviario: 'Rodoviário',
  misto: 'Misto',
};

type RoomOccupant = {
  personId?: string;
  personName?: string;
  personType?: 'player' | 'staff' | string;
};

type RoomAssignment = {
  roomNumber?: string;
  roomTypeId?: string;
  roomTypeName?: string;
  occupants?: RoomOccupant[];
};

function parseRegistrationProfile(raw: unknown): {
  personal?: { cpf?: string; rg?: string; nickname?: string };
} {
  if (!raw || typeof raw !== 'object') return {};
  return raw as { personal?: { cpf?: string; rg?: string; nickname?: string } };
}

function nicknameFromProfile(raw: unknown): string | null {
  const nick = parseRegistrationProfile(raw).personal?.nickname?.trim();
  return nick || null;
}

function formatIsoDate(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function formatBrDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, day] = iso.split('-');
  if (!y || !m || !day) return iso;
  return `${day}/${m}/${y}`;
}

function roomTypeFromCount(count: number): string {
  if (count <= 1) return 'Single';
  if (count === 2) return 'Double';
  return 'Triplo';
}

function weekdayLabelPt(dateIso: string): string {
  const d = new Date(`${dateIso}T12:00:00-03:00`);
  return d.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' });
}

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

@Injectable()
export class FutebolRelatoriosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agenda: FutebolAgendaService,
  ) {}

  async getPassageiros(travelId: string): Promise<PassageirosReportDto> {
    const travel = await this.loadTravel(travelId);
    const categories = this.resolveTravelCategories(travel);
    const categoryLabel = await this.buildCategoryLabel(categories);

    const participants = await this.prisma.travelParticipant.findMany({
      where: { travelLogisticsId: travelId },
      orderBy: [{ personType: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    let athletes: RelatorioPessoaRow[];
    let staff: RelatorioPessoaRow[];
    let guests: RelatorioPessoaRow[] = [];

    if (participants.length > 0) {
      const fromConvocation = await this.enrichFromParticipants(
        travel.tenantId,
        participants,
      );
      athletes = fromConvocation.athletes;
      staff = fromConvocation.staff;
      guests = fromConvocation.guests;
    } else {
      const roomAssignments = this.parseRooms(travel.accommodationRooms);
      const occupantIds = this.collectOccupantIds(roomAssignments);

      if (occupantIds.playerIds.size > 0 || occupantIds.staffIds.size > 0) {
        const enriched = await this.enrichOccupants(
          travel.tenantId,
          occupantIds.playerIds,
          occupantIds.staffIds,
        );
        athletes = enriched.athletes;
        staff = enriched.staff;
      } else {
        const squad = await this.loadSquadForCategories(travel.tenantId, categories);
        athletes = squad.athletes;
        staff = squad.staff;
      }
    }

    return {
      travel: this.buildTravelMeta(travel, categories, categoryLabel),
      athletes,
      staff,
      guests,
      generatedAt: new Date().toISOString(),
    };
  }

  async getHospedes(travelId: string): Promise<HospedesReportDto> {
    const travel = await this.loadTravel(travelId);
    const categories = this.resolveTravelCategories(travel);
    const categoryLabel = await this.buildCategoryLabel(categories);
    const rooms = this.parseRooms(travel.accommodationRooms);

    const rows: RelatorioHospedeRow[] = [];
    let groupIndex = 0;

    for (const room of rooms) {
      const roomNumber = (room.roomNumber ?? '').trim();
      const occupants = (room.occupants ?? []).filter(
        (o) => (o.personName ?? '').trim() || o.personId,
      );
      if (!roomNumber && occupants.length === 0) continue;

      const roomType =
        (room.roomTypeName ?? '').trim() ||
        roomTypeFromCount(occupants.length || 1);
      groupIndex += 1;

      if (occupants.length === 0) {
        rows.push({
          num: rows.length + 1,
          name: '—',
          nickname: null,
          cpf: null,
          rg: null,
          birthDate: null,
          roomNumber: roomNumber || '—',
          roomType,
          groupIndex,
          isFirstInGroup: true,
          groupSize: 1,
        });
        continue;
      }

      for (let i = 0; i < occupants.length; i += 1) {
        const occ = occupants[i]!;
        const details = await this.resolvePersonDetails(
          travel.tenantId,
          occ.personId,
          occ.personType,
          occ.personName,
        );
        rows.push({
          num: rows.length + 1,
          name: details.name,
          nickname: details.nickname,
          cpf: details.cpf,
          rg: details.rg,
          birthDate: details.birthDate,
          role: details.role,
          roomNumber: roomNumber || '—',
          roomType,
          groupIndex,
          isFirstInGroup: i === 0,
          groupSize: occupants.length,
        });
      }
    }

    return {
      travel: this.buildTravelMeta(travel, categories, categoryLabel),
      rows,
      generatedAt: new Date().toISOString(),
    };
  }

  /** Escudo do adversário e logo do campeonato a partir dos cadastros (match por nome). */
  private async resolveMatchLogos(
    opponentName: string | null,
    championshipName: string | null,
  ): Promise<{ opponentLogoUrl: string | null; championshipLogoUrl: string | null }> {
    const [teams, championships] = await Promise.all([
      opponentName?.trim()
        ? this.prisma.visitingTeam.findMany({ select: { name: true, logoUrl: true } })
        : Promise.resolve([] as { name: string; logoUrl: string | null }[]),
      championshipName?.trim()
        ? this.prisma.championship.findMany({ select: { name: true, logoUrl: true } })
        : Promise.resolve([] as { name: string; logoUrl: string | null }[]),
    ]);

    const pick = (
      rows: { name: string; logoUrl: string | null }[],
      target: string | null,
    ): string | null => {
      const wanted = target?.trim();
      if (!wanted) return null;
      const withLogo = rows.filter((r) => r.logoUrl?.trim());
      const strictKey = normalizeTeamNameKeyForMerge(wanted);
      const strict = withLogo.find(
        (r) => normalizeTeamNameKeyForMerge(r.name) === strictKey,
      );
      if (strict) return strict.logoUrl;
      const softKey = softNormalizeTeamNameKey(wanted);
      if (!softKey) return null;
      const soft = withLogo.find((r) => softNormalizeTeamNameKey(r.name) === softKey);
      return soft?.logoUrl ?? null;
    };

    return {
      opponentLogoUrl: pick(teams, opponentName),
      championshipLogoUrl: pick(championships, championshipName),
    };
  }

  async getPressKit(travelId: string): Promise<PressKitReportDto> {
    const base = await this.getPassageiros(travelId);
    const travel = await this.loadTravel(travelId);
    const season = travel.matchDate.getFullYear();
    const playerIds = base.athletes
      .map((athlete) => athlete.playerId)
      .filter((id): id is string => !!id);
    const officialStats =
      playerIds.length > 0
        ? await this.prisma.fmfPlayerMatchStat.findMany({
            where: {
              playerId: { in: playerIds },
              match: { season, tenantId: travel.tenantId },
            },
          })
        : [];
    const statsByPlayer = new Map<
      string,
      {
        season: number;
        matches: number;
        starts: number;
        minutes: number;
        goals: number;
        yellowCards: number;
        redCards: number;
      }
    >();
    for (const stat of officialStats) {
      const current = statsByPlayer.get(stat.playerId) ?? {
        season,
        matches: 0,
        starts: 0,
        minutes: 0,
        goals: 0,
        yellowCards: 0,
        redCards: 0,
      };
      if (stat.played) current.matches += 1;
      if (stat.starter) current.starts += 1;
      current.minutes += stat.minutesPlayed;
      current.goals += stat.goals;
      current.yellowCards += stat.yellowCards;
      current.redCards += stat.redCards;
      statsByPlayer.set(stat.playerId, current);
    }
    const athletes = base.athletes.map((athlete, index) => ({
      ...athlete,
      num: index + 1,
      seasonStats: athlete.playerId
        ? (statsByPlayer.get(athlete.playerId) ?? {
            season,
            matches: 0,
            starts: 0,
            minutes: 0,
            goals: 0,
            yellowCards: 0,
            redCards: 0,
          })
        : null,
    }));
    const config = this.resolvePressKitConfig(travel.beatscodeMeta, athletes, travel.matchDate);
    const byId = new Map(
      athletes.filter((a) => a.playerId).map((a) => [a.playerId!, a]),
    );
    const starters: RelatorioPessoaRow[] = [];
    for (const id of config.starterPlayerIds) {
      if (!id) continue;
      const row = byId.get(id);
      if (row) starters.push({ ...row, num: starters.length + 1 });
    }
    const starterSet = new Set(config.starterPlayerIds.filter(Boolean));
    const substitutes = athletes
      .filter((a) => a.playerId && !starterSet.has(a.playerId))
      .map((a, i) => ({ ...a, num: i + 1 }));

    const logos = await this.resolveMatchLogos(
      base.travel.opponentName,
      base.travel.championshipName,
    );
    const uniforms =
      travel.uniforms && typeof travel.uniforms === 'object'
        ? (travel.uniforms as Record<string, unknown>)
        : {};
    const gameKitName =
      typeof uniforms.athletesGame === 'string' ? uniforms.athletesGame.trim() : '';
    const uniformKit = await this.resolveUniformKitByName(gameKitName);

    const athletesWithJersey = this.applyJerseyOverrides(athletes, config.jerseyOverrides);
    const startersWithJersey = this.applyJerseyOverrides(starters, config.jerseyOverrides);
    const substitutesWithJersey = this.applyJerseyOverrides(
      substitutes,
      config.jerseyOverrides,
    );

    return {
      travel: base.travel,
      athletes: athletesWithJersey,
      staff: base.staff,
      starters: startersWithJersey,
      substitutes: substitutesWithJersey,
      config,
      opponentLogoUrl: logos.opponentLogoUrl,
      championshipLogoUrl: logos.championshipLogoUrl,
      uniformKit,
      generatedAt: new Date().toISOString(),
    };
  }

  async savePressKit(
    travelId: string,
    raw: Partial<PressKitConfigDto> | null | undefined,
  ): Promise<PressKitReportDto> {
    const travel = await this.loadTravel(travelId);
    const base = await this.getPassageiros(travelId);
    const sanitized = this.sanitizePressKitConfig(raw, base.athletes, travel.matchDate);

    const meta =
      travel.beatscodeMeta &&
      typeof travel.beatscodeMeta === 'object' &&
      !Array.isArray(travel.beatscodeMeta)
        ? { ...(travel.beatscodeMeta as Record<string, unknown>) }
        : {};
    meta.pressKit = sanitized;

    await this.prisma.travelLogistics.update({
      where: { id: travelId },
      data: {
        beatscodeMeta: meta as Parameters<
          typeof this.prisma.travelLogistics.update
        >[0]['data']['beatscodeMeta'],
      },
    });

    return this.getPressKit(travelId);
  }

  async getLayoutRelacionados(travelId: string): Promise<LayoutRelacionadosReportDto> {
    const base = await this.getPassageiros(travelId);
    const travel = await this.loadTravel(travelId);
    const itinerary =
      travel.itinerary && typeof travel.itinerary === 'object'
        ? (travel.itinerary as Record<string, unknown>)
        : {};
    const uniformsRaw =
      travel.uniforms && typeof travel.uniforms === 'object'
        ? (travel.uniforms as Record<string, unknown>)
        : {};

    const mapStops = (raw: unknown) => {
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
        .map((s) => ({
          place: typeof s.place === 'string' ? s.place : '',
          arriveAt: typeof s.arriveAt === 'string' ? s.arriveAt : null,
          departAt: typeof s.departAt === 'string' ? s.departAt : null,
          notes: typeof s.notes === 'string' ? s.notes : null,
        }))
        .filter((s) => s.place.trim());
    };

    const homeMatchAgenda = Array.isArray(itinerary.homeMatchAgenda)
      ? itinerary.homeMatchAgenda
          .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
          .map((s) => ({
            label: typeof s.label === 'string' ? s.label : '',
            time: typeof s.time === 'string' ? s.time : null,
            notes: typeof s.notes === 'string' ? s.notes : null,
          }))
          .filter((s) => s.label.trim())
      : [];

    const busType =
      itinerary.busType === 'LD' || itinerary.busType === 'DD'
        ? itinerary.busType
        : null;

    const uniforms = {
      athletesGame:
        typeof uniformsRaw.athletesGame === 'string'
          ? uniformsRaw.athletesGame
          : null,
      athletesTravel:
        typeof uniformsRaw.athletesTravel === 'string'
          ? uniformsRaw.athletesTravel
          : null,
      staffGame:
        typeof uniformsRaw.staffGame === 'string' ? uniformsRaw.staffGame : null,
      staffTravel:
        typeof uniformsRaw.staffTravel === 'string'
          ? uniformsRaw.staffTravel
          : null,
    };

    const [athletesGame, athletesTravel, staffGame, staffTravel] =
      await Promise.all([
        this.resolveUniformKitByName(uniforms.athletesGame),
        this.resolveUniformKitByName(uniforms.athletesTravel),
        this.resolveUniformKitByName(uniforms.staffGame),
        this.resolveUniformKitByName(uniforms.staffTravel),
      ]);

    return {
      travel: base.travel,
      athletes: base.athletes,
      staff: base.staff,
      guests: base.guests,
      busType,
      outbound: mapStops(itinerary.outbound),
      returnStops: mapStops(itinerary.return),
      homeMatchAgenda,
      uniforms,
      uniformKits: {
        athletesGame,
        athletesTravel,
        staffGame,
        staffTravel,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async listTravels(tenantId: string) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório');
    const todayKey = dateKeyInBrazil(new Date());
    return this.prisma.travelLogistics.findMany({
      where: {
        tenantId: tenantId.trim(),
        status: { not: 'cancelado' },
        matchDate: { gte: new Date(`${todayKey}T00:00:00.000-03:00`) },
      },
      orderBy: [{ matchDate: 'asc' }],
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        _count: { select: { participants: true } },
      },
    });
  }

  async getProgramacaoSemanal(filters: {
    tenantId: string;
    from: string;
    to: string;
    categories?: string;
  }): Promise<ProgramacaoSemanalReportDto> {
    const tenantId = filters.tenantId?.trim();
    if (!tenantId) throw new BadRequestException('tenantId é obrigatório');

    const from = new Date(filters.from);
    const to = new Date(filters.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Período inválido');
    }
    if (to < from) {
      throw new BadRequestException('Data final deve ser posterior à inicial');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, logoUrl: true, categories: true },
    });
    if (!tenant) throw new NotFoundException('Clube não encontrado');

    const requestedCats = (filters.categories ?? '')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const fixtureCats = await this.prisma.fixtureCategory.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    const categoryLabels: Record<string, string> = {};
    for (const fc of fixtureCats) {
      categoryLabels[fc.value] = fc.labelPT;
    }

    let columns = requestedCats;
    if (columns.length === 0) {
      const tenantCats = Array.isArray(tenant.categories)
        ? (tenant.categories as string[]).filter(Boolean)
        : [];
      columns =
        tenantCats.length > 0
          ? tenantCats
          : fixtureCats.map((c) => c.value);
    }

    const items = await this.agenda.getCalendar({
      from: from.toISOString(),
      to: to.toISOString(),
      tenantId,
    });

    const dayMap = new Map<string, ProgramacaoSemanalReportDto['days'][number]>();
    const fromKey = filters.from.slice(0, 10);
    const toKey = filters.to.slice(0, 10);
    let cursorKey = fromKey;

    while (cursorKey <= toKey) {
      const byCategory: Record<string, ProgramacaoSemanalReportDto['days'][number]['byCategory'][string]> =
        {};
      for (const cat of columns) byCategory[cat] = [];
      dayMap.set(cursorKey, {
        date: cursorKey,
        weekdayLabel: capitalizeFirst(weekdayLabelPt(cursorKey)),
        dateLabel: formatBrDate(cursorKey),
        byCategory,
      });
      cursorKey = addDaysToDateKey(cursorKey, 1);
    }

    for (const item of items) {
      if (item.source === 'bch_booking') continue;
      const start = new Date(item.startAt);
      const dateIso = dateKeyInBrazil(start);
      const day = dayMap.get(dateIso);
      if (!day) continue;

      const itemCats =
        item.categories && item.categories.length > 0
          ? item.categories
          : item.category
            ? [item.category]
            : [];

      const targetCats =
        itemCats.length > 0
          ? itemCats.filter((c) => columns.includes(c))
          : columns;

      if (targetCats.length === 0) continue;

      for (const targetCat of targetCats) {
        if (!day.byCategory[targetCat]) day.byCategory[targetCat] = [];

        const time = formatTimeBrazil(start, item.allDay, item.dayPeriod);

        day.byCategory[targetCat].push({
          time,
          title: item.title,
          type: item.type,
          typeLabel: FOOTBALL_AGENDA_TYPE_LABEL[item.type] ?? item.type,
          location: item.location,
        });
      }
    }

    for (const day of dayMap.values()) {
      for (const cat of Object.keys(day.byCategory)) {
        day.byCategory[cat].sort((a, b) => compareTimeLabels(a.time, b.time));
      }
    }

    const periodLabel = `${formatBrDate(filters.from)} — ${formatBrDate(filters.to)}`;

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        logoUrl: tenant.logoUrl,
      },
      period: {
        from: filters.from.slice(0, 10),
        to: filters.to.slice(0, 10),
        label: periodLabel,
      },
      categories: columns,
      categoryLabels,
      days: [...dayMap.values()],
      generatedAt: new Date().toISOString(),
    };
  }

  private async loadTravel(id: string) {
    const travel = await this.prisma.travelLogistics.findUnique({
      where: { id },
      include: {
        tenant: {
          select: { id: true, name: true, tradeName: true, logoUrl: true },
        },
      },
    });
    if (!travel) throw new NotFoundException('Viagem não encontrada');
    return travel;
  }

  private resolveTravelCategories(travel: {
    category: string | null;
    categories: unknown;
  }): string[] {
    const list = parseTravelCategories(travel.categories);
    if (list.length > 0) return list;
    if (travel.category?.trim()) return [travel.category.trim()];
    return [];
  }

  private async buildCategoryLabel(categories: string[]): Promise<string> {
    if (categories.length === 0) return 'Todas as categorias';
    const fixtureCats = await this.prisma.fixtureCategory.findMany({
      where: { value: { in: categories } },
    });
    const map = new Map(fixtureCats.map((c) => [c.value, c.labelPT]));
    return categories.map((c) => map.get(c) ?? c).join(' · ');
  }

  private buildTravelMeta(
    travel: Awaited<ReturnType<typeof this.loadTravel>>,
    categories: string[],
    categoryLabel: string,
  ): RelatorioTravelMeta {
    const hotelStay =
      travel.hotelStay && typeof travel.hotelStay === 'object'
        ? (travel.hotelStay as { checkIn?: unknown; checkOut?: unknown })
        : {};
    const hotelCheckIn =
      typeof hotelStay.checkIn === 'string' && hotelStay.checkIn.trim()
        ? hotelStay.checkIn
        : null;
    const hotelCheckOut =
      typeof hotelStay.checkOut === 'string' && hotelStay.checkOut.trim()
        ? hotelStay.checkOut
        : null;

    return {
      id: travel.id,
      tenant: {
        id: travel.tenant.id,
        name: travel.tenant.name,
        tradeName: travel.tenant.tradeName,
        logoUrl: travel.tenant.logoUrl,
      },
      categories,
      categoryLabel,
      matchDate: formatIsoDate(travel.matchDate) ?? '',
      opponentName: travel.opponentName,
      championshipName: travel.championshipName,
      stadiumName: travel.stadiumName,
      city: travel.city,
      country: travel.country,
      transportType: travel.transportType,
      transportLabel: travel.transportType
        ? (TRANSPORT_LABELS[travel.transportType] ?? travel.transportType)
        : null,
      transportDetails: travel.transportDetails,
      estimatedDeparture: travel.estimatedDeparture?.toISOString() ?? null,
      estimatedArrival: travel.estimatedArrival?.toISOString() ?? null,
      hotelName: travel.hotelName,
      hotelAddress: travel.hotelAddress,
      hotelCheckIn,
      hotelCheckOut,
      isHomeMatch: travel.isHomeMatch === true,
      notes: travel.notes,
    };
  }

  private parseRooms(raw: unknown): RoomAssignment[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter((r) => r && typeof r === 'object') as RoomAssignment[];
  }

  private collectOccupantIds(rooms: RoomAssignment[]) {
    const playerIds = new Set<string>();
    const staffIds = new Set<string>();
    for (const room of rooms) {
      for (const occ of room.occupants ?? []) {
        if (!occ.personId) continue;
        if (occ.personType === 'staff') staffIds.add(occ.personId);
        else playerIds.add(occ.personId);
      }
    }
    return { playerIds, staffIds };
  }

  private async enrichOccupants(
    tenantId: string,
    playerIds: Set<string>,
    staffIds: Set<string>,
  ) {
    const athletes: RelatorioPessoaRow[] = [];
    const staff: RelatorioPessoaRow[] = [];

    if (playerIds.size > 0) {
      const players = await this.prisma.player.findMany({
        where: { tenantId, id: { in: [...playerIds] } },
        orderBy: { name: 'asc' },
      });
      for (const p of players) {
        if (this.isInactivePlayer(p.registrationProfile)) continue;
        const profile = parseRegistrationProfile(p.registrationProfile);
        athletes.push({
          num: athletes.length + 1,
          name: p.name,
          nickname: nicknameFromProfile(p.registrationProfile),
          cpf: profile.personal?.cpf ?? null,
          rg: profile.personal?.rg ?? null,
          birthDate: formatIsoDate(p.birthDate),
          playerId: p.id,
          jerseyNumber: p.jerseyNumber ?? null,
          cbfRegistration: p.cbfRegistration ?? null,
          position: p.position ?? null,
          photoUrl: p.photoUrl ?? null,
        });
      }
    }

    if (staffIds.size > 0) {
      const members = await this.prisma.technicalStaff.findMany({
        where: { tenantId, id: { in: [...staffIds] } },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      });
      for (const s of members) {
        staff.push({
          num: staff.length + 1,
          name: s.name,
          nickname: null,
          cpf: s.cpf,
          rg: s.rg,
          birthDate: formatIsoDate(s.birthDate),
          role: s.role,
          staffId: s.id,
          photoUrl: s.photoUrl ?? null,
        });
      }
    }

    return { athletes, staff };
  }

  /** Prioridade: convocação (TravelParticipant) com FK no cadastro do atleta. */
  private async enrichFromParticipants(
    tenantId: string,
    participants: Array<{
      personType: string;
      playerId: string | null;
      staffId: string | null;
      guestName: string | null;
      guestDocument: string | null;
    }>,
  ) {
    const athletes: RelatorioPessoaRow[] = [];
    const staff: RelatorioPessoaRow[] = [];
    const guests: RelatorioPessoaRow[] = [];

    const playerIds = participants
      .filter((p) => p.personType === 'player' && p.playerId)
      .map((p) => p.playerId!);
    const staffIds = participants
      .filter((p) => p.personType === 'staff' && p.staffId)
      .map((p) => p.staffId!);

    const players =
      playerIds.length > 0
        ? await this.prisma.player.findMany({
            where: { tenantId, id: { in: playerIds } },
          })
        : [];
    const playerMap = new Map(players.map((p) => [p.id, p]));

    const staffMembers =
      staffIds.length > 0
        ? await this.prisma.technicalStaff.findMany({
            where: { tenantId, id: { in: staffIds } },
          })
        : [];
    const staffMap = new Map(staffMembers.map((s) => [s.id, s]));

    for (const part of participants) {
      if (part.personType === 'player' && part.playerId) {
        const p = playerMap.get(part.playerId);
        if (!p || this.isInactivePlayer(p.registrationProfile)) continue;
        const profile = parseRegistrationProfile(p.registrationProfile);
        athletes.push({
          num: athletes.length + 1,
          name: p.name,
          nickname: nicknameFromProfile(p.registrationProfile),
          cpf: profile.personal?.cpf ?? null,
          rg: profile.personal?.rg ?? null,
          birthDate: formatIsoDate(p.birthDate),
          playerId: p.id,
          jerseyNumber: p.jerseyNumber ?? null,
          cbfRegistration: p.cbfRegistration ?? null,
          position: p.position ?? null,
          photoUrl: p.photoUrl ?? null,
        });
        continue;
      }
      if (part.personType === 'staff' && part.staffId) {
        const s = staffMap.get(part.staffId);
        if (!s) continue;
        staff.push({
          num: staff.length + 1,
          name: s.name,
          nickname: null,
          cpf: s.cpf,
          rg: s.rg,
          birthDate: formatIsoDate(s.birthDate),
          role: s.role,
          staffId: s.id,
          photoUrl: s.photoUrl ?? null,
        });
        continue;
      }
      if (part.personType === 'guest') {
        guests.push({
          num: guests.length + 1,
          name: (part.guestName ?? '—').trim() || '—',
          nickname: null,
          cpf: part.guestDocument ?? null,
          rg: null,
          birthDate: null,
        });
      }
    }

    return { athletes, staff, guests };
  }

  private async loadSquadForCategories(tenantId: string, categories: string[]) {
    const players = await this.prisma.player.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });

    const filteredPlayers = players.filter((p) => {
      if (this.isInactivePlayer(p.registrationProfile)) return false;
      if (categories.length === 0) return true;
      return p.category ? categories.includes(p.category) : false;
    });

    const staffAll = await this.prisma.technicalStaff.findMany({
      where: { tenantId },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });

    const filteredStaff = staffAll.filter((s) => {
      if (categories.length === 0) return true;
      const cats = s.categories as string[] | null;
      if (!cats || !Array.isArray(cats) || cats.length === 0) return true;
      return categories.some((c) => cats.includes(c));
    });

    const athletes: RelatorioPessoaRow[] = filteredPlayers.map((p, i) => {
      const profile = parseRegistrationProfile(p.registrationProfile);
      return {
        num: i + 1,
        name: p.name,
        nickname: nicknameFromProfile(p.registrationProfile),
        cpf: profile.personal?.cpf ?? null,
        rg: profile.personal?.rg ?? null,
        birthDate: formatIsoDate(p.birthDate),
        playerId: p.id,
        jerseyNumber: p.jerseyNumber ?? null,
        cbfRegistration: p.cbfRegistration ?? null,
        position: p.position ?? null,
        photoUrl: p.photoUrl ?? null,
      };
    });

    const staff: RelatorioPessoaRow[] = filteredStaff.map((s, i) => ({
      num: i + 1,
      name: s.name,
      nickname: null,
      cpf: s.cpf,
      rg: s.rg,
      birthDate: formatIsoDate(s.birthDate),
      role: s.role,
      staffId: s.id,
      photoUrl: s.photoUrl ?? null,
    }));

    return { athletes, staff };
  }

  private isInactivePlayer(registrationProfile: unknown): boolean {
    const profile = registrationProfile as { sports?: { situation?: string } } | null;
    const situation = normalizeSportsSituation(profile?.sports?.situation);
    return isArchivedSportsSituation(situation) || isLoanedSportsSituation(situation);
  }

  private resolvePressKitConfig(
    beatscodeMeta: unknown,
    athletes: RelatorioPessoaRow[],
    matchDate: Date,
  ): PressKitConfigDto {
    const meta =
      beatscodeMeta && typeof beatscodeMeta === 'object' && !Array.isArray(beatscodeMeta)
        ? (beatscodeMeta as Record<string, unknown>)
        : {};
    const raw =
      meta.pressKit && typeof meta.pressKit === 'object' && !Array.isArray(meta.pressKit)
        ? (meta.pressKit as Partial<PressKitConfigDto>)
        : {};
    return this.sanitizePressKitConfig(raw, athletes, matchDate);
  }

  private sanitizePressKitConfig(
    raw: Partial<PressKitConfigDto> | null | undefined,
    athletes: RelatorioPessoaRow[],
    matchDate: Date,
  ): PressKitConfigDto {
    const athleteIds = athletes.map((a) => a.playerId).filter((id): id is string => !!id);
    const athleteSet = new Set(athleteIds);

    const rawStarterIds = Array.isArray(raw?.starterPlayerIds)
      ? raw!.starterPlayerIds
      : [];
    const seenStarters = new Set<string>();
    let starterPlayerIds = Array.from({ length: 11 }, (_, i) => {
      const id = rawStarterIds[i];
      if (typeof id !== 'string' || !id.trim() || !athleteSet.has(id) || seenStarters.has(id)) {
        return '';
      }
      seenStarters.add(id);
      return id;
    });
    if (seenStarters.size === 0) {
      starterPlayerIds = Array.from({ length: 11 }, (_, i) => athleteIds[i] ?? '');
    }

    const mapNamed = (
      list: unknown,
      defaultRoles: readonly string[],
    ): PressKitNamedRole[] => {
      const rows = Array.isArray(list) ? list : [];
      return defaultRoles.map((defaultRole, i) => {
        const item = rows[i];
        if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>;
          return {
            role:
              typeof o.role === 'string' && o.role.trim()
                ? o.role.trim()
                : defaultRole,
            name: typeof o.name === 'string' ? o.name.trim() : '',
          };
        }
        return { role: defaultRole, name: '' };
      });
    };

    const matchTimeFromDate = (() => {
      try {
        const h = matchDate.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'America/Sao_Paulo',
        });
        if (h && h !== '00:00') return h;
      } catch {
        /* ignore */
      }
      return null;
    })();

    const formationRaw =
      typeof raw?.formation === 'string' && raw.formation.trim()
        ? raw.formation.trim()
        : '4-3-3';
    const allowedFormations = new Set([
      '4-3-3',
      '4-4-2',
      '4-2-3-1',
      '3-5-2',
      '3-4-3',
    ]);
    const formation = allowedFormations.has(formationRaw) ? formationRaw : '4-3-3';

    const jerseyOverrides: Record<string, number | null> = {};
    if (raw?.jerseyOverrides && typeof raw.jerseyOverrides === 'object') {
      for (const [playerId, value] of Object.entries(raw.jerseyOverrides)) {
        if (!athleteSet.has(playerId)) continue;
        if (value === null || value === undefined) {
          jerseyOverrides[playerId] = null;
          continue;
        }
        const n = typeof value === 'number' ? value : Number(value);
        if (Number.isFinite(n) && n >= 0 && n <= 99) {
          jerseyOverrides[playerId] = Math.trunc(n);
        }
      }
    }

    return {
      phase:
        typeof raw?.phase === 'string' && raw.phase.trim() ? raw.phase.trim() : null,
      matchTime:
        typeof raw?.matchTime === 'string' && raw.matchTime.trim()
          ? raw.matchTime.trim()
          : matchTimeFromDate,
      referees: mapNamed(raw?.referees, DEFAULT_PRESS_KIT_REFEREE_ROLES),
      directors: mapNamed(raw?.directors, DEFAULT_PRESS_KIT_DIRECTOR_ROLES),
      starterPlayerIds,
      formation,
      jerseyOverrides,
      contactLine:
        typeof raw?.contactLine === 'string' && raw.contactLine.trim()
          ? raw.contactLine.trim()
          : null,
      showDisclaimer: raw?.showDisclaimer !== false,
    };
  }

  private applyJerseyOverrides(
    rows: RelatorioPessoaRow[],
    overrides: Record<string, number | null> | undefined,
  ): RelatorioPessoaRow[] {
    if (!overrides || Object.keys(overrides).length === 0) return rows;
    return rows.map((row) => {
      if (!row.playerId || !(row.playerId in overrides)) return row;
      const next = overrides[row.playerId];
      return { ...row, jerseyNumber: next ?? null };
    });
  }

  private async resolveUniformKitByName(
    name: string | null | undefined,
  ): Promise<PressKitUniformKitDto | null> {
    const kitName = name?.trim();
    if (!kitName) return null;
    const kit = await this.prisma.logisticsUniformKit.findFirst({
      where: { name: kitName },
      select: {
        name: true,
        imageUrl: true,
        items: {
          orderBy: { sortOrder: 'asc' },
          select: {
            clothingItem: { select: { name: true, imageUrl: true } },
          },
        },
      },
    });
    if (!kit) return null;
    return {
      name: kit.name,
      imageUrl: kit.imageUrl,
      items: kit.items.map(({ clothingItem }) => clothingItem),
    };
  }

  private async resolvePersonDetails(
    tenantId: string,
    personId: string | undefined,
    personType: string | undefined,
    fallbackName: string | undefined,
  ) {
    if (personId && personType === 'staff') {
      const s = await this.prisma.technicalStaff.findFirst({
        where: { id: personId, tenantId },
      });
      if (s) {
        return {
          name: s.name,
          nickname: null as string | null,
          cpf: s.cpf,
          rg: s.rg,
          birthDate: formatIsoDate(s.birthDate),
          role: s.role,
        };
      }
    }
    if (personId) {
      const p = await this.prisma.player.findFirst({
        where: { id: personId, tenantId },
      });
      if (p) {
        const profile = parseRegistrationProfile(p.registrationProfile);
        return {
          name: p.name,
          nickname: nicknameFromProfile(p.registrationProfile),
          cpf: profile.personal?.cpf ?? null,
          rg: profile.personal?.rg ?? null,
          birthDate: formatIsoDate(p.birthDate),
          role: null,
        };
      }
    }
    return {
      name: (fallbackName ?? '—').trim() || '—',
      nickname: null as string | null,
      cpf: null,
      rg: null,
      birthDate: null,
      role: null,
    };
  }
}
