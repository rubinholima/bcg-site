import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { computeTeamRatingAverage } from '../futebol-treinadores/coach-match-report.util';
import { PrismaService } from '../prisma/prisma.service';
import { FutebolRelatoriosService } from '../futebol-relatorios/futebol-relatorios.service';
import { travelMatchesCategoryFilter } from '../futebol-agenda/travel-categories.util';
import { dedupeTravelLogisticsList } from '../logistica/travel-logistics-dedup.util';
import {
  matchCategoriesEquivalent,
  matchDatesEquivalent,
  matchOpponentsEquivalent,
} from '../common/match-game-opponent.util';
import {
  FMF_SYNC_TENANT_DEFAULTS,
  isFmfSyncTenantSlug,
} from '../fmf-scraper/fmf-sync-tenants.config';
import {
  buildCompletedGames,
  type CoachCompletedGame,
} from '../futebol-treinadores/coach-context.helper';
import { coachMatchReportInclude } from '../futebol-treinadores/futebol-treinadores.constants';
import type {
  FutebolGameDetailDto,
  FutebolGameListItem,
  FutebolGamesListDto,
  FutebolMatchAttachmentDto,
  FutebolMatchIncidentDto,
  GameLinkRefs,
} from './futebol-jogos.types';
import type { SumulaCartoesMatchDto } from '../futebol-relatorios/futebol-relatorios.types';
import {
  normalizeAttachmentKind,
  normalizeIncidentKind,
} from './futebol-jogos.constants';
import {
  CoachMatchStatsService,
  type UpsertMatchStatOverrideInput,
} from '../coach-match-stats/coach-match-stats.service';

function categoryMatches(
  travelCategory: string | null | undefined,
  categories: unknown,
  filter: string,
): boolean {
  if (!filter) return true;
  return travelMatchesCategoryFilter({ category: travelCategory ?? null, categories }, filter);
}

function parseGameKey(raw: string): { prefix: 'fmf' | 'travel'; id: string } {
  const decoded = decodeURIComponent(raw.trim());
  const idx = decoded.indexOf(':');
  if (idx <= 0) throw new BadRequestException('Identificador de jogo inválido');
  const prefix = decoded.slice(0, idx);
  const id = decoded.slice(idx + 1).trim();
  if (!id) throw new BadRequestException('Identificador de jogo inválido');
  if (prefix !== 'fmf' && prefix !== 'travel') {
    throw new BadRequestException('Identificador de jogo inválido');
  }
  return { prefix, id };
}

function matchSeason(isoDate: string, season: number): boolean {
  const y = new Date(isoDate).getFullYear();
  return y === season;
}

function mapCoachReport(row: {
  id: string;
  status: string;
  matchDate: Date | null;
  opponentName: string | null;
  teamReport: string | null;
  matchSummary: string | null;
  aspectsToImprove: string | null;
  goodActions: string | null;
  opponentBestJersey: number | null;
  opponentBestPosition: string | null;
  opponentBestNotes: string | null;
  generalNotes: string | null;
  attachments: Array<{ id: string; label: string | null; fileUrl: string; kind: string | null }>;
  playerRatings: Array<{
    playerId: string;
    rating: number | null;
    individualReport: string | null;
    isMatchBest: boolean;
    player: { name: string; jerseyNumber: number | null };
  }>;
}) {
  const playerRatings = row.playerRatings.map((r) => ({
    playerId: r.playerId,
    name: r.player.name,
    jerseyNumber: r.player.jerseyNumber,
    rating: r.rating,
    individualReport: r.individualReport,
    isMatchBest: r.isMatchBest,
  }));

  return {
    id: row.id,
    status: row.status,
    matchDate: row.matchDate?.toISOString() ?? null,
    opponentName: row.opponentName,
    teamReport: row.teamReport,
    matchSummary: row.matchSummary ?? row.teamReport,
    aspectsToImprove: row.aspectsToImprove,
    goodActions: row.goodActions,
    opponentBestJersey: row.opponentBestJersey,
    opponentBestPosition: row.opponentBestPosition,
    opponentBestNotes: row.opponentBestNotes,
    generalNotes: row.generalNotes,
    teamRatingAverage: computeTeamRatingAverage(playerRatings),
    attachments: row.attachments.map((a) => ({
      id: a.id,
      label: a.label,
      fileUrl: a.fileUrl,
      kind: a.kind,
    })),
    playerRatings,
  };
}

function gameListKeepScore(g: FutebolGameListItem): number {
  let score = 0;
  if (g.hasSumula) score += 1000;
  if (g.fmfMatchReportId) score += 500;
  if (g.scoreLabel !== '—') score += 200;
  if (g.hasCoachReport) score += 50;
  if (g.competition?.trim()) score += 20;
  if (g.stadiumName?.trim()) score += 5;
  score += g.opponentName.length * 0.1;
  return score;
}

function dedupeGameListItems(games: FutebolGameListItem[]): FutebolGameListItem[] {
  const kept: FutebolGameListItem[] = [];
  for (const game of games) {
    const idx = kept.findIndex(
      (existing) =>
        matchOpponentsEquivalent(existing.opponentName, game.opponentName) &&
        matchDatesEquivalent(existing.matchDate, game.matchDate) &&
        matchCategoriesEquivalent(existing.category, game.category),
    );
    if (idx < 0) {
      kept.push(game);
      continue;
    }
    if (gameListKeepScore(game) > gameListKeepScore(kept[idx])) {
      kept[idx] = game;
    }
  }
  return kept;
}

@Injectable()
export class FutebolJogosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly relatorios: FutebolRelatoriosService,
    private readonly matchStats: CoachMatchStatsService,
  ) {}

  private async tenantAliases(tenantId: string, name: string): Promise<string[]> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });
    if (tenant?.slug && isFmfSyncTenantSlug(tenant.slug)) {
      return [...FMF_SYNC_TENANT_DEFAULTS[tenant.slug].fmfTeamNames];
    }
    return [name];
  }

  private async loadBaseData(tenantId: string, categoryFilter: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, slug: true, tradeName: true },
    });
    if (!tenant) throw new NotFoundException('Clube não encontrado');

    const clubName = tenant.tradeName?.trim() || tenant.name;
    const aliases = await this.tenantAliases(tenantId, tenant.name);
    const now = new Date();

    const travelsRaw = await this.prisma.travelLogistics.findMany({
      where: { tenantId, status: { not: 'cancelado' } },
      orderBy: { matchDate: 'asc' },
      select: {
        id: true,
        tenantId: true,
        matchDate: true,
        opponentName: true,
        championshipName: true,
        category: true,
        categories: true,
        isHomeMatch: true,
        stadiumName: true,
        city: true,
        status: true,
      },
    });

    const travels = dedupeTravelLogisticsList(travelsRaw) as typeof travelsRaw;

    const fmfReports = await this.prisma.fmfMatchReport.findMany({
      where: { tenantId },
      orderBy: { matchDate: 'desc' },
      include: {
        playerStats: {
          select: { goals: true, yellowCards: true, redCards: true },
        },
      },
    });

    const statOverrides = await this.prisma.coachMatchStatOverride.findMany({
      where: {
        tenantId,
        ...(categoryFilter
          ? { OR: [{ category: categoryFilter }, { category: null }] }
          : {}),
      },
    });

    const coachReports = await this.prisma.coachMatchReport.findMany({
      where: { tenantId },
      select: { id: true, fmfMatchReportId: true, travelLogisticsId: true },
    });

    const coachByFmf = new Map(
      coachReports.filter((r) => r.fmfMatchReportId).map((r) => [r.fmfMatchReportId!, r.id]),
    );
    const coachByTravel = new Map(
      coachReports.filter((r) => r.travelLogisticsId).map((r) => [r.travelLogisticsId!, r.id]),
    );

    const completedGames = buildCompletedGames({
      now,
      category: categoryFilter,
      clubName,
      aliases,
      travels,
      fmfReports,
      overrides: statOverrides,
    });

    return {
      tenant,
      clubName,
      aliases,
      now,
      travels,
      completedGames,
      coachByFmf,
      coachByTravel,
    };
  }

  private completedToListItem(
    g: CoachCompletedGame,
    coachByFmf: Map<string, string>,
    coachByTravel: Map<string, string>,
    travelMeta: { stadiumName: string | null; city: string | null; category: string | null } | null,
  ): FutebolGameListItem {
    const hasCoachReport =
      (g.fmfMatchReportId != null && coachByFmf.has(g.fmfMatchReportId)) ||
      (g.travelLogisticsId != null && coachByTravel.has(g.travelLogisticsId));

    return {
      gameKey: g.gameKey,
      status: 'completed',
      matchDate: g.matchDate,
      opponentName: g.opponentName,
      competition: g.competition,
      category: g.category ?? travelMeta?.category ?? null,
      isHome: g.isHome,
      homeTeam: g.homeTeam,
      awayTeam: g.awayTeam,
      scoreLabel: g.scoreLabel,
      result: g.result,
      hasSumula: g.fmfMatchReportId != null,
      fmfMatchReportId: g.fmfMatchReportId,
      travelLogisticsId: g.travelLogisticsId,
      yellowCards: g.yellowCards,
      redCards: g.redCards,
      stadiumName: travelMeta?.stadiumName ?? null,
      city: travelMeta?.city ?? null,
      hasCoachReport,
      incidentCount: 0,
      attachmentCount: 0,
      possessionPct: g.possessionPct,
      setPiecesFor: g.setPiecesFor,
      setPiecesAgainst: g.setPiecesAgainst,
    };
  }

  async listGames(filters: {
    tenantId: string;
    category?: string;
    season?: number;
    status?: string;
  }): Promise<FutebolGamesListDto> {
    const tenantId = filters.tenantId?.trim();
    if (!tenantId) throw new BadRequestException('tenantId é obrigatório');

    const season =
      typeof filters.season === 'number' && filters.season >= 2000
        ? filters.season
        : new Date().getFullYear();
    const categoryFilter = filters.category?.trim() ?? '';
    const statusFilter = filters.status?.trim() || null;

    const { tenant, now, travels, completedGames, coachByFmf, coachByTravel } =
      await this.loadBaseData(tenantId, categoryFilter);

    const travelById = new Map(travels.map((t) => [t.id, t]));

    const upcoming: FutebolGameListItem[] = travels
      .filter(
        (t) =>
          t.matchDate >= now &&
          categoryMatches(t.category, t.categories, categoryFilter) &&
          matchSeason(t.matchDate.toISOString(), season) &&
          !completedGames.some((g) => g.travelLogisticsId === t.id),
      )
      .map((t) => ({
        gameKey: `travel:${t.id}`,
        status: 'upcoming' as const,
        matchDate: t.matchDate.toISOString(),
        opponentName: t.opponentName ?? 'Adversário',
        competition: t.championshipName,
        category: t.category,
        isHome: t.isHomeMatch ?? true,
        homeTeam: t.isHomeMatch ? tenant.name : (t.opponentName ?? 'Adversário'),
        awayTeam: t.isHomeMatch ? (t.opponentName ?? 'Adversário') : tenant.name,
        scoreLabel: '—',
        result: null,
        hasSumula: false,
        fmfMatchReportId: null,
        travelLogisticsId: t.id,
        yellowCards: 0,
        redCards: 0,
        stadiumName: t.stadiumName,
        city: t.city,
        hasCoachReport: coachByTravel.has(t.id),
        incidentCount: 0,
        attachmentCount: 0,
        possessionPct: null,
        setPiecesFor: null,
        setPiecesAgainst: null,
      }));

    const completed: FutebolGameListItem[] = completedGames
      .filter((g) => matchSeason(g.matchDate, season))
      .map((g) => {
        const travel = g.travelLogisticsId ? travelById.get(g.travelLogisticsId) : null;
        return this.completedToListItem(
          g,
          coachByFmf,
          coachByTravel,
          travel
            ? {
                stadiumName: travel.stadiumName,
                city: travel.city,
                category: travel.category,
              }
            : null,
        );
      });

    let games = dedupeGameListItems(
      [...upcoming, ...completed].sort(
        (a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime(),
      ),
    );

    if (statusFilter === 'upcoming') {
      games = games.filter((g) => g.status === 'upcoming');
    } else if (statusFilter === 'completed') {
      games = games.filter((g) => g.status === 'completed');
    } else     if (statusFilter === 'with_sumula') {
      games = games.filter((g) => g.hasSumula);
    }

    games = await this.attachRecordCounts(tenantId, games);

    return {
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      filters: { category: categoryFilter || null, season, status: statusFilter },
      games,
    };
  }

  async getGameDetail(tenantIdRaw: string, gameKeyRaw: string): Promise<FutebolGameDetailDto> {
    const tenantId = tenantIdRaw?.trim();
    if (!tenantId) throw new BadRequestException('tenantId é obrigatório');

    const { prefix, id } = parseGameKey(gameKeyRaw);
    const { tenant, completedGames, travels } = await this.loadBaseData(tenantId, '');

    let completed: CoachCompletedGame | null = null;
    let listItem: FutebolGameListItem | null = null;

    if (prefix === 'fmf') {
      completed = completedGames.find((g) => g.fmfMatchReportId === id) ?? null;
      if (!completed) {
        const report = await this.prisma.fmfMatchReport.findFirst({
          where: { id, tenantId },
          include: {
            playerStats: { select: { goals: true, yellowCards: true, redCards: true } },
          },
        });
        if (!report) throw new NotFoundException('Jogo não encontrado');
        completed = buildCompletedGames({
          now: new Date(Date.now() + 86400000),
          category: '',
          clubName: tenant.tradeName?.trim() || tenant.name,
          aliases: await this.tenantAliases(tenantId, tenant.name),
          travels,
          fmfReports: [report],
          overrides: [],
        })[0]!;
      }
    } else {
      const travel = travels.find((t) => t.id === id);
      if (!travel) throw new NotFoundException('Jogo não encontrado');

      completed =
        completedGames.find((g) => g.travelLogisticsId === id) ??
        completedGames.find((g) => g.gameKey === `travel:${id}`) ??
        null;

      if (!completed) {
        const now = new Date();
        const isUpcoming = travel.matchDate >= now;
        listItem = {
          gameKey: `travel:${travel.id}`,
          status: isUpcoming ? 'upcoming' : 'completed',
          matchDate: travel.matchDate.toISOString(),
          opponentName: travel.opponentName ?? 'Adversário',
          competition: travel.championshipName,
          category: travel.category,
          isHome: travel.isHomeMatch ?? true,
          homeTeam: travel.isHomeMatch
            ? tenant.name
            : (travel.opponentName ?? 'Adversário'),
          awayTeam: travel.isHomeMatch
            ? (travel.opponentName ?? 'Adversário')
            : tenant.name,
          scoreLabel: '—',
          result: null,
          hasSumula: false,
          fmfMatchReportId: null,
          travelLogisticsId: travel.id,
          yellowCards: 0,
          redCards: 0,
          stadiumName: travel.stadiumName,
          city: travel.city,
          hasCoachReport: false,
          incidentCount: 0,
          attachmentCount: 0,
          possessionPct: null,
          setPiecesFor: null,
          setPiecesAgainst: null,
        };
      }
    }

    if (completed && !listItem) {
      const travel = completed.travelLogisticsId
        ? travels.find((t) => t.id === completed!.travelLogisticsId)
        : null;
      const coachReports = await this.prisma.coachMatchReport.findMany({
        where: { tenantId },
        select: { id: true, fmfMatchReportId: true, travelLogisticsId: true },
      });
      const coachByFmf = new Map(
        coachReports.filter((r) => r.fmfMatchReportId).map((r) => [r.fmfMatchReportId!, r.id]),
      );
      const coachByTravel = new Map(
        coachReports.filter((r) => r.travelLogisticsId).map((r) => [r.travelLogisticsId!, r.id]),
      );
      listItem = this.completedToListItem(
        completed,
        coachByFmf,
        coachByTravel,
        travel
          ? { stadiumName: travel.stadiumName, city: travel.city, category: travel.category }
          : null,
      );
    }

    if (!listItem || !completed) {
      if (listItem && !completed) {
        completed = {
          gameKey: listItem.gameKey,
          fmfMatchReportId: listItem.fmfMatchReportId,
          travelLogisticsId: listItem.travelLogisticsId,
          category: listItem.category,
          matchDate: listItem.matchDate,
          opponentName: listItem.opponentName,
          competition: listItem.competition,
          phase: null,
          round: null,
          isHome: listItem.isHome,
          homeTeam: listItem.homeTeam,
          awayTeam: listItem.awayTeam,
          homeScore: null,
          awayScore: null,
          scoreLabel: listItem.scoreLabel,
          result: listItem.result,
          goalsFor: null,
          goalsAgainst: null,
          yellowCards: listItem.yellowCards,
          redCards: listItem.redCards,
          possessionPct: listItem.possessionPct,
          setPiecesFor: listItem.setPiecesFor,
          setPiecesAgainst: listItem.setPiecesAgainst,
          statsSource: null,
          hasDetailedStats: false,
        };
      } else {
        throw new NotFoundException('Jogo não encontrado');
      }
    }

    const fmfId = completed.fmfMatchReportId;
    const travelId = completed.travelLogisticsId;

    const [fmfRow, statOverride, coachReportRow] = await Promise.all([
      fmfId
        ? this.prisma.fmfMatchReport.findFirst({
            where: { id: fmfId, tenantId },
            select: {
              sourceUrl: true,
              kickoffTime: true,
              firstHalfMinutes: true,
              secondHalfMinutes: true,
              totalMinutes: true,
              season: true,
              category: true,
              occurrencesText: true,
            },
          })
        : Promise.resolve(null),
      fmfId
        ? this.prisma.coachMatchStatOverride.findUnique({ where: { fmfMatchReportId: fmfId } })
        : travelId
          ? this.prisma.coachMatchStatOverride.findFirst({
              where: { tenantId, travelLogisticsId: travelId },
            })
          : Promise.resolve(null),
      fmfId
        ? this.prisma.coachMatchReport.findFirst({
            where: { tenantId, fmfMatchReportId: fmfId },
            include: coachMatchReportInclude,
          })
        : travelId
          ? this.prisma.coachMatchReport.findFirst({
              where: { tenantId, travelLogisticsId: travelId },
              include: coachMatchReportInclude,
            })
          : Promise.resolve(null),
    ]);

    let sumulaMatch: SumulaCartoesMatchDto | null = null;
    let disciplineForMatch: FutebolGameDetailDto['disciplineForMatch'] = [];

    if (fmfId) {
      const report = await this.relatorios.getSumulaCartoesReport({
        tenantId,
        matchId: fmfId,
        season: fmfRow?.season,
        category: fmfRow?.category,
      });
      sumulaMatch = report.match;
      if (report.match) {
        const allPlayers = [...report.match.home.players, ...report.match.away.players];
        disciplineForMatch = allPlayers
          .filter((p) => p.yellowCards > 0 || p.redCards > 0)
          .map((p) => ({
            playerId: p.playerId ?? '',
            name: p.name,
            jerseyNumber: p.jerseyNumber,
            yellowCards: p.yellowCards,
            redCards: p.redCards,
          }))
          .filter((p) => p.playerId || p.name);
      }
    }

    const [incidents, matchAttachments] = await Promise.all([
      this.loadIncidents(tenantId, fmfId, travelId),
      this.loadMatchAttachments(tenantId, fmfId, travelId),
    ]);

    return {
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      game: {
        ...listItem,
        ...completed,
        incidentCount: incidents.length,
        attachmentCount: matchAttachments.length,
      },
      sourceUrl: fmfRow?.sourceUrl ?? null,
      kickoffTime: fmfRow?.kickoffTime ?? null,
      firstHalfMinutes: fmfRow?.firstHalfMinutes ?? null,
      secondHalfMinutes: fmfRow?.secondHalfMinutes ?? null,
      totalMinutes: fmfRow?.totalMinutes ?? null,
      occurrencesText: fmfRow?.occurrencesText ?? null,
      statOverrideNotes: statOverride?.notes ?? null,
      matchStatOverride: statOverride
        ? {
            goalsFor: statOverride.goalsFor,
            goalsAgainst: statOverride.goalsAgainst,
            yellowCards: statOverride.yellowCards,
            redCards: statOverride.redCards,
            possessionPct: statOverride.possessionPct,
            setPiecesFor: statOverride.setPiecesFor,
            setPiecesAgainst: statOverride.setPiecesAgainst,
            notes: statOverride.notes,
          }
        : null,
      coachReport: coachReportRow ? mapCoachReport(coachReportRow) : null,
      sumulaMatch,
      disciplineForMatch,
      incidents,
      matchAttachments,
    };
  }

  private async attachRecordCounts(
    tenantId: string,
    games: FutebolGameListItem[],
  ): Promise<FutebolGameListItem[]> {
    const fmfIds = [...new Set(games.map((g) => g.fmfMatchReportId).filter(Boolean))] as string[];
    const travelIds = [...new Set(games.map((g) => g.travelLogisticsId).filter(Boolean))] as string[];
    if (fmfIds.length === 0 && travelIds.length === 0) return games;

    const orFilters: Array<Record<string, unknown>> = [];
    if (fmfIds.length) orFilters.push({ fmfMatchReportId: { in: fmfIds } });
    if (travelIds.length) orFilters.push({ travelLogisticsId: { in: travelIds } });

    const [incidents, attachments] = await Promise.all([
      this.prisma.footballMatchIncident.findMany({
        where: { tenantId, OR: orFilters },
        select: { fmfMatchReportId: true, travelLogisticsId: true },
      }),
      this.prisma.footballMatchAttachment.findMany({
        where: { tenantId, OR: orFilters },
        select: { fmfMatchReportId: true, travelLogisticsId: true },
      }),
    ]);

    const incidentByFmf = new Map<string, number>();
    const incidentByTravel = new Map<string, number>();
    for (const row of incidents) {
      if (row.fmfMatchReportId) {
        incidentByFmf.set(row.fmfMatchReportId, (incidentByFmf.get(row.fmfMatchReportId) ?? 0) + 1);
      }
      if (row.travelLogisticsId) {
        incidentByTravel.set(
          row.travelLogisticsId,
          (incidentByTravel.get(row.travelLogisticsId) ?? 0) + 1,
        );
      }
    }

    const attachByFmf = new Map<string, number>();
    const attachByTravel = new Map<string, number>();
    for (const row of attachments) {
      if (row.fmfMatchReportId) {
        attachByFmf.set(row.fmfMatchReportId, (attachByFmf.get(row.fmfMatchReportId) ?? 0) + 1);
      }
      if (row.travelLogisticsId) {
        attachByTravel.set(
          row.travelLogisticsId,
          (attachByTravel.get(row.travelLogisticsId) ?? 0) + 1,
        );
      }
    }

    return games.map((g) => ({
      ...g,
      incidentCount:
        (g.fmfMatchReportId ? incidentByFmf.get(g.fmfMatchReportId) ?? 0 : 0) +
        (g.travelLogisticsId ? incidentByTravel.get(g.travelLogisticsId) ?? 0 : 0),
      attachmentCount:
        (g.fmfMatchReportId ? attachByFmf.get(g.fmfMatchReportId) ?? 0 : 0) +
        (g.travelLogisticsId ? attachByTravel.get(g.travelLogisticsId) ?? 0 : 0),
    }));
  }

  private async loadIncidents(
    tenantId: string,
    fmfMatchReportId: string | null,
    travelLogisticsId: string | null,
  ): Promise<FutebolMatchIncidentDto[]> {
    if (!fmfMatchReportId && !travelLogisticsId) return [];

    const rows = await this.prisma.footballMatchIncident.findMany({
      where: {
        tenantId,
        OR: [
          ...(fmfMatchReportId ? [{ fmfMatchReportId }] : []),
          ...(travelLogisticsId ? [{ travelLogisticsId }] : []),
        ],
      },
      orderBy: [{ minute: 'asc' }, { createdAt: 'asc' }],
    });

    return rows.map((row) => ({
      id: row.id,
      source: row.source === 'fmf' ? 'fmf' : 'manual',
      kind: row.kind,
      description: row.description,
      minute: row.minute,
      period: row.period,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  private async loadMatchAttachments(
    tenantId: string,
    fmfMatchReportId: string | null,
    travelLogisticsId: string | null,
  ): Promise<FutebolMatchAttachmentDto[]> {
    if (!fmfMatchReportId && !travelLogisticsId) return [];

    const rows = await this.prisma.footballMatchAttachment.findMany({
      where: {
        tenantId,
        OR: [
          ...(fmfMatchReportId ? [{ fmfMatchReportId }] : []),
          ...(travelLogisticsId ? [{ travelLogisticsId }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      fileUrl: row.fileUrl,
      kind: row.kind,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  private async resolveGameLinks(tenantId: string, gameKeyRaw: string): Promise<GameLinkRefs> {
    const { prefix, id } = parseGameKey(gameKeyRaw);
    if (prefix === 'fmf') {
      const report = await this.prisma.fmfMatchReport.findFirst({
        where: { id, tenantId },
        select: { id: true },
      });
      if (!report) throw new NotFoundException('Jogo não encontrado');
      const { completedGames } = await this.loadBaseData(tenantId, '');
      const game = completedGames.find((g) => g.fmfMatchReportId === id);
      return {
        fmfMatchReportId: id,
        travelLogisticsId: game?.travelLogisticsId ?? null,
      };
    }

    const travel = await this.prisma.travelLogistics.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!travel) throw new NotFoundException('Jogo não encontrado');
    const { completedGames } = await this.loadBaseData(tenantId, '');
    const game = completedGames.find((g) => g.travelLogisticsId === id);
    return {
      fmfMatchReportId: game?.fmfMatchReportId ?? null,
      travelLogisticsId: id,
    };
  }

  async createIncident(input: {
    tenantId: string;
    gameKey: string;
    kind?: unknown;
    description?: unknown;
    minute?: unknown;
    period?: unknown;
    authorUserId?: string;
  }) {
    const tenantId = input.tenantId?.trim();
    const description = typeof input.description === 'string' ? input.description.trim() : '';
    if (!tenantId || !description) {
      throw new BadRequestException('tenantId e description são obrigatórios');
    }

    const links = await this.resolveGameLinks(tenantId, input.gameKey);
    if (!links.fmfMatchReportId && !links.travelLogisticsId) {
      throw new BadRequestException('Jogo sem vínculo para registrar ocorrência');
    }

    const minuteRaw = input.minute;
    const minute =
      minuteRaw == null || minuteRaw === ''
        ? null
        : Number.isFinite(Number(minuteRaw))
          ? Math.max(0, Math.round(Number(minuteRaw)))
          : null;
    const period =
      typeof input.period === 'string' && ['1T', '2T'].includes(input.period.trim().toUpperCase())
        ? input.period.trim().toUpperCase()
        : null;

    const row = await this.prisma.footballMatchIncident.create({
      data: {
        tenantId,
        fmfMatchReportId: links.fmfMatchReportId,
        travelLogisticsId: links.travelLogisticsId,
        source: 'manual',
        kind: normalizeIncidentKind(input.kind),
        description,
        minute,
        period,
        authorUserId: input.authorUserId ?? null,
      },
    });

    return {
      id: row.id,
      source: 'manual' as const,
      kind: row.kind,
      description: row.description,
      minute: row.minute,
      period: row.period,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async updateIncident(input: {
    tenantId: string;
    incidentId: string;
    kind?: unknown;
    description?: unknown;
    minute?: unknown;
    period?: unknown;
  }) {
    const row = await this.prisma.footballMatchIncident.findFirst({
      where: { id: input.incidentId, tenantId: input.tenantId },
    });
    if (!row) throw new NotFoundException('Ocorrência não encontrada');
    if (row.source !== 'manual') {
      throw new BadRequestException('Ocorrências importadas da FMF não podem ser editadas');
    }

    const description =
      typeof input.description === 'string' ? input.description.trim() : row.description;
    if (!description) throw new BadRequestException('Descrição é obrigatória');

    const minuteRaw = input.minute;
    const minute =
      minuteRaw === undefined
        ? row.minute
        : minuteRaw == null || minuteRaw === ''
          ? null
          : Number.isFinite(Number(minuteRaw))
            ? Math.max(0, Math.round(Number(minuteRaw)))
            : row.minute;
    const period =
      input.period === undefined
        ? row.period
        : typeof input.period === 'string' &&
            ['1T', '2T'].includes(input.period.trim().toUpperCase())
          ? input.period.trim().toUpperCase()
          : null;

    const updated = await this.prisma.footballMatchIncident.update({
      where: { id: row.id },
      data: {
        kind: input.kind !== undefined ? normalizeIncidentKind(input.kind) : row.kind,
        description,
        minute,
        period,
      },
    });

    return {
      id: updated.id,
      source: 'manual' as const,
      kind: updated.kind,
      description: updated.description,
      minute: updated.minute,
      period: updated.period,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deleteIncident(tenantId: string, incidentId: string) {
    const row = await this.prisma.footballMatchIncident.findFirst({
      where: { id: incidentId, tenantId },
    });
    if (!row) throw new NotFoundException('Ocorrência não encontrada');
    if (row.source !== 'manual') {
      throw new BadRequestException('Ocorrências importadas da FMF não podem ser apagadas');
    }
    await this.prisma.footballMatchIncident.delete({ where: { id: row.id } });
    return { ok: true };
  }

  async createAttachment(input: {
    tenantId: string;
    gameKey: string;
    label?: unknown;
    fileUrl?: unknown;
    kind?: unknown;
    authorUserId?: string;
  }) {
    const tenantId = input.tenantId?.trim();
    const fileUrl = typeof input.fileUrl === 'string' ? input.fileUrl.trim() : '';
    if (!tenantId || !fileUrl) {
      throw new BadRequestException('tenantId e fileUrl são obrigatórios');
    }

    const links = await this.resolveGameLinks(tenantId, input.gameKey);
    if (!links.fmfMatchReportId && !links.travelLogisticsId) {
      throw new BadRequestException('Jogo sem vínculo para anexar documento');
    }

    const row = await this.prisma.footballMatchAttachment.create({
      data: {
        tenantId,
        fmfMatchReportId: links.fmfMatchReportId,
        travelLogisticsId: links.travelLogisticsId,
        label: typeof input.label === 'string' ? input.label.trim() || null : null,
        fileUrl,
        kind: normalizeAttachmentKind(input.kind),
        authorUserId: input.authorUserId ?? null,
      },
    });

    return {
      id: row.id,
      label: row.label,
      fileUrl: row.fileUrl,
      kind: row.kind,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async deleteAttachment(tenantId: string, attachmentId: string) {
    const row = await this.prisma.footballMatchAttachment.findFirst({
      where: { id: attachmentId, tenantId },
    });
    if (!row) throw new NotFoundException('Anexo não encontrado');
    await this.prisma.footballMatchAttachment.delete({ where: { id: row.id } });
    return { ok: true };
  }

  async upsertMatchStatsForGame(
    tenantId: string,
    gameKeyRaw: string,
    input: Omit<
      UpsertMatchStatOverrideInput,
      'tenantId' | 'fmfMatchReportId' | 'travelLogisticsId' | 'matchDate' | 'opponentName' | 'category'
    > &
      Partial<Pick<UpsertMatchStatOverrideInput, 'matchDate' | 'opponentName' | 'category'>>,
  ) {
    const detail = await this.getGameDetail(tenantId, gameKeyRaw);
    const game = detail.game;
    return this.matchStats.upsert({
      tenantId,
      category: input.category ?? game.category,
      fmfMatchReportId: game.fmfMatchReportId,
      travelLogisticsId: game.travelLogisticsId,
      matchDate: input.matchDate ?? game.matchDate.slice(0, 10),
      opponentName: input.opponentName ?? game.opponentName,
      goalsFor: input.goalsFor,
      goalsAgainst: input.goalsAgainst,
      yellowCards: input.yellowCards,
      redCards: input.redCards,
      possessionPct: input.possessionPct,
      setPiecesFor: input.setPiecesFor,
      setPiecesAgainst: input.setPiecesAgainst,
      notes: input.notes,
    });
  }
}
