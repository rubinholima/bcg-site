import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CaptacaoService } from '../captacao/captacao.service';
import { OpponentRadarService } from './opponent-radar.service';
import { isPlayerMatchStandout, resolveSeasonFromMatchDate } from './season-standout.util';
import { normalizeIdentityKey } from './season-standout.util';

export type SeasonHighlightsFilters = {
  tenantId: string;
  season?: number;
  category?: string;
  competition?: string;
  club?: string;
  search?: string;
  periodFrom?: string;
  periodTo?: string;
};

@Injectable()
export class SeasonHighlightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly opponentRadar: OpponentRadarService,
    private readonly captacao: CaptacaoService,
  ) {}

  async getManagementSummary(tenantId: string, season?: number) {
    const year = season ?? new Date().getFullYear();
    await this.opponentRadar.ensureBackfill(tenantId);

    const reports = await this.prisma.coachMatchReport.findMany({
      where: { tenantId, status: 'finalizado' },
      include: {
        playerRatings: { where: { OR: [{ isMatchBest: true }, { isStaffStandout: true }] } },
        fmfMatchReport: { select: { season: true, competition: true, category: true } },
      },
    });

    const byCategory: Record<string, number> = {};
    const byCompetition: Record<string, number> = {};
    let ourStandouts = 0;

    for (const r of reports) {
      const s = resolveSeasonFromMatchDate(r.matchDate, r.fmfMatchReport?.season);
      if (s !== year) continue;
      const cat = r.category ?? r.fmfMatchReport?.category ?? '—';
      byCategory[cat] = (byCategory[cat] ?? 0) + r.playerRatings.length;
      ourStandouts += r.playerRatings.length;
      const comp = r.fmfMatchReport?.competition;
      if (comp) byCompetition[comp] = (byCompetition[comp] ?? 0) + r.playerRatings.length;
    }

    const profiles = await this.prisma.opponentHighlightProfile.findMany({
      where: { tenantId },
      include: { events: { where: { season: year } } },
    });

    const opponentRecurrent = profiles.filter((p) => p.events.length >= 2).length;
    const cbfConfirmed = profiles.filter((p) => p.cbfRegistration).length;
    const unresolved = profiles.filter((p) => !p.cbfRegistration).length;

    const byClub: Record<string, number> = {};
    for (const p of profiles) {
      for (const e of p.events) {
        const club = e.opponentClub ?? '—';
        byClub[club] = (byClub[club] ?? 0) + 1;
      }
    }

    const topOur = await this.listBostonCity({ tenantId, season: year });
    const topOpponent = await this.listOpponentRadar({ tenantId, season: year });

    return {
      season: year,
      ourStandoutSelections: ourStandouts,
      byCategory,
      byCompetition,
      byOpponentClub: byClub,
      opponentProfiles: profiles.length,
      opponentRecurrent,
      opponentCbfConfirmed: cbfConfirmed,
      opponentUnresolved: unresolved,
      topBostonCity: topOur.slice(0, 10),
      topOpponentRadar: topOpponent.slice(0, 10),
    };
  }

  async listBostonCity(filters: SeasonHighlightsFilters) {
    const season = filters.season ?? new Date().getFullYear();
    const reports = await this.prisma.coachMatchReport.findMany({
      where: {
        tenantId: filters.tenantId,
        status: 'finalizado',
        ...(filters.category ? { category: filters.category } : {}),
      },
      include: {
        playerRatings: {
          where: { OR: [{ isMatchBest: true }, { isStaffStandout: true }] },
          include: {
            player: {
              select: {
                id: true,
                name: true,
                category: true,
                position: true,
                jerseyNumber: true,
                registrationProfile: true,
              },
            },
          },
        },
        fmfMatchReport: {
          select: {
            id: true,
            season: true,
            competition: true,
            category: true,
            homeTeam: true,
            awayTeam: true,
            homeScore: true,
            awayScore: true,
            matchDate: true,
          },
        },
        travelLogistics: { select: { championshipName: true } },
      },
      orderBy: { matchDate: 'desc' },
    });

    type Agg = {
      playerId: string;
      name: string;
      category: string | null;
      position: string | null;
      jerseyNumber: number | null;
      season: number;
      selectionCount: number;
      ratingSum: number;
      ratingCount: number;
      matches: Array<{
        reportId: string;
        matchDate: string | null;
        opponent: string | null;
        competition: string | null;
        scoreLabel: string | null;
        rating: number | null;
        assists: number;
        individualReport: string | null;
        isMatchBest: boolean;
        isStaffStandout: boolean;
      }>;
    };

    const map = new Map<string, Agg>();

    for (const report of reports) {
      const reportSeason = resolveSeasonFromMatchDate(
        report.matchDate,
        report.fmfMatchReport?.season,
      );
      if (reportSeason !== season) continue;
      const competition =
        report.fmfMatchReport?.competition ??
        report.travelLogistics?.championshipName ??
        null;
      if (filters.competition && competition !== filters.competition) continue;

      const home = report.fmfMatchReport?.homeScore;
      const away = report.fmfMatchReport?.awayScore;
      const scoreLabel =
        home != null && away != null ? `${home} x ${away}` : null;

      for (const rating of report.playerRatings) {
        if (!isPlayerMatchStandout(rating)) continue;
        const p = rating.player;
        if (
          filters.search?.trim() &&
          !p.name.toLowerCase().includes(filters.search.trim().toLowerCase())
        ) {
          continue;
        }

        let agg = map.get(p.id);
        if (!agg) {
          agg = {
            playerId: p.id,
            name: p.name,
            category: p.category,
            position: p.position,
            jerseyNumber: p.jerseyNumber,
            season: reportSeason,
            selectionCount: 0,
            ratingSum: 0,
            ratingCount: 0,
            matches: [],
          };
          map.set(p.id, agg);
        }
        agg.selectionCount += 1;
        if (rating.rating != null) {
          agg.ratingSum += rating.rating;
          agg.ratingCount += 1;
        }
        agg.matches.push({
          reportId: report.id,
          matchDate: (report.matchDate ?? report.fmfMatchReport?.matchDate)?.toISOString() ?? null,
          opponent: report.opponentName,
          competition,
          scoreLabel,
          rating: rating.rating,
          assists: rating.assists,
          individualReport: rating.individualReport,
          isMatchBest: rating.isMatchBest,
          isStaffStandout: rating.isStaffStandout,
        });
      }
    }

    const playerIds = [...map.keys()];
    const fmfStats =
      playerIds.length > 0
        ? await this.prisma.fmfPlayerMatchStat.findMany({
            where: {
              playerId: { in: playerIds },
              match: { tenantId: filters.tenantId, season },
            },
            select: {
              playerId: true,
              goals: true,
              minutesPlayed: true,
              matchId: true,
            },
          })
        : [];

    const seasonStatsByPlayer = new Map<
      string,
      { goals: number; minutes: number; matches: number }
    >();
    for (const s of fmfStats) {
      const row = seasonStatsByPlayer.get(s.playerId) ?? {
        goals: 0,
        minutes: 0,
        matches: 0,
      };
      row.goals += s.goals;
      row.minutes += s.minutesPlayed;
      row.matches += 1;
      seasonStatsByPlayer.set(s.playerId, row);
    }

    return [...map.values()]
      .map((row) => ({
        ...row,
        averageRating:
          row.ratingCount > 0 ? Math.round((row.ratingSum / row.ratingCount) * 10) / 10 : null,
        seasonStatsOfficial: seasonStatsByPlayer.get(row.playerId) ?? null,
      }))
      .sort((a, b) => b.selectionCount - a.selectionCount || a.name.localeCompare(b.name, 'pt-BR'));
  }

  async getBostonCityPlayerDetail(tenantId: string, playerId: string, season?: number) {
    const rows = await this.listBostonCity({ tenantId, season });
    const hit = rows.find((r) => r.playerId === playerId);
    if (!hit) throw new NotFoundException('Atleta sem destaques na temporada.');
    return hit;
  }

  async listOpponentRadar(filters: SeasonHighlightsFilters) {
    await this.opponentRadar.ensureBackfill(filters.tenantId);
    const season = filters.season ?? new Date().getFullYear();

    const profiles = await this.prisma.opponentHighlightProfile.findMany({
      where: { tenantId: filters.tenantId },
      include: {
        events: {
          where: { season },
          orderBy: { matchDate: 'desc' },
        },
        scoutingProspect: { select: { id: true, name: true, stage: true } },
      },
      orderBy: [{ highlightCount: 'desc' }, { lastSeenAt: 'desc' }],
    });

    const search = filters.search?.trim().toLowerCase();
    const clubFilter = filters.club?.trim().toLowerCase();

    return profiles
      .filter((p) => p.events.length > 0)
      .filter((p) => {
        if (filters.category && p.category !== filters.category) {
          const eventCat = p.events.some((e) => e.category === filters.category);
          if (!eventCat) return false;
        }
        if (clubFilter) {
          const clubHit =
            p.lastKnownClub?.toLowerCase().includes(clubFilter) ||
            p.events.some((e) => e.opponentClub?.toLowerCase().includes(clubFilter));
          if (!clubHit) return false;
        }
        if (search) {
          const hay = [
            p.displayName,
            p.cbfRegistration ?? '',
            p.lastKnownClub ?? '',
            p.position ?? '',
          ]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(search)) return false;
        }
        if (filters.competition) {
          if (!p.events.some((e) => e.competition === filters.competition)) return false;
        }
        return true;
      })
      .map((p) => ({
        id: p.id,
        displayName: p.displayName,
        cbfRegistration: p.cbfRegistration,
        position: p.position,
        lastKnownClub: p.lastKnownClub,
        category: p.category,
        firstSeenAt: p.firstSeenAt.toISOString(),
        lastSeenAt: p.lastSeenAt.toISOString(),
        highlightCount: p.events.length,
        identitySource: p.identitySource,
        identityConfidence: p.identityConfidence,
        managementNotes: p.managementNotes,
        managementStatus: p.managementStatus,
        scoutingProspectId: p.scoutingProspectId,
        scoutingProspect: p.scoutingProspect,
        seasonSelectionCount: p.events.length,
        events: p.events.map((e) => ({
          id: e.id,
          matchDate: e.matchDate?.toISOString() ?? null,
          opponentClub: e.opponentClub,
          competition: e.competition,
          category: e.category,
          jerseyNumber: e.jerseyNumber,
          position: e.position,
          staffNotes: e.staffNotes,
          scoreLabel: e.scoreLabel,
          resolvedName: e.resolvedName,
          cbfRegistration: e.cbfRegistration,
          identitySource: e.identitySource,
          officialStats: e.officialStats,
          reportId: e.reportId,
          fmfMatchReportId: e.fmfMatchReportId,
        })),
        clubHistory: [...new Set(p.events.map((e) => e.opponentClub).filter(Boolean))],
      }));
  }

  async getOpponentProfileDetail(tenantId: string, profileId: string, season?: number) {
    const list = await this.listOpponentRadar({ tenantId, season });
    const hit = list.find((p) => p.id === profileId);
    if (!hit) throw new NotFoundException('Perfil de radar não encontrado.');
    return hit;
  }

  async updateOpponentProfileManagement(
    tenantId: string,
    profileId: string,
    input: { managementNotes?: string; managementStatus?: string },
  ) {
    const profile = await this.prisma.opponentHighlightProfile.findFirst({
      where: { id: profileId, tenantId },
    });
    if (!profile) throw new NotFoundException('Perfil não encontrado.');
    return this.prisma.opponentHighlightProfile.update({
      where: { id: profileId },
      data: {
        managementNotes: input.managementNotes?.trim() ?? profile.managementNotes,
        managementStatus: input.managementStatus?.trim() ?? profile.managementStatus,
      },
    });
  }

  async sendToCaptacao(tenantId: string, profileId: string, userHasCaptacao: boolean) {
    if (!userHasCaptacao) {
      throw new ForbiddenException('Sem permissão para Captação.');
    }
    await this.opponentRadar.ensureBackfill(tenantId);
    const profile = await this.prisma.opponentHighlightProfile.findFirst({
      where: { id: profileId, tenantId },
      include: { events: { orderBy: { matchDate: 'desc' } } },
    });
    if (!profile) throw new NotFoundException('Perfil não encontrado.');

    if (profile.scoutingProspectId) {
      const existing = await this.prisma.scoutingProspect.findUnique({
        where: { id: profile.scoutingProspectId },
      });
      if (existing) {
        return { prospect: existing, created: false, linkedProfileId: profile.id };
      }
    }

    const linked = await this.findProspectForProfile(tenantId, profile);
    if (linked) {
      await this.prisma.opponentHighlightProfile.update({
        where: { id: profile.id },
        data: { scoutingProspectId: linked.id },
      });
      return { prospect: linked, created: false, linkedProfileId: profile.id };
    }

    const highlightContext = profile.events
      .slice(0, 8)
      .map(
        (e) =>
          `${e.matchDate?.toISOString().slice(0, 10) ?? '—'} · ${e.competition ?? '—'} · ${e.scoreLabel ?? '—'} · ${e.staffNotes ?? ''}`,
      )
      .join('\n');

    const profileLinks: Record<string, string> = {
      opponentRadarProfileId: profile.id,
    };
    if (profile.cbfRegistration) profileLinks.cbfRegistration = profile.cbfRegistration;

    const prospect = await this.captacao.createProspect({
      tenantId,
      name: profile.displayName,
      position: profile.position ?? undefined,
      currentClub: profile.lastKnownClub ?? undefined,
      competition: profile.events[0]?.competition ?? undefined,
      targetCategory: profile.category ?? undefined,
      source: 'jogo',
      sourceDetails: `Radar adversário (Melhores da Temporada) · ${profile.highlightCount} destaque(s)\n${highlightContext}`,
      notes: profile.managementNotes ?? undefined,
      strengths: profile.events[0]?.staffNotes ?? undefined,
      profileLinks,
      flowPath: 'integracao_direta',
      evaluationOutcome: 'pendente',
      stage: 'identificado',
    });

    await this.prisma.opponentHighlightProfile.update({
      where: { id: profile.id },
      data: { scoutingProspectId: prospect.id },
    });

    return { prospect, created: true, linkedProfileId: profile.id };
  }

  private async findProspectForProfile(
    tenantId: string,
    profile: { id: string; cbfRegistration: string | null; displayName: string; lastKnownClub: string | null },
  ) {
    const prospects = await this.prisma.scoutingProspect.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        currentClub: true,
        profileLinks: true,
        stage: true,
      },
      take: 500,
      orderBy: { updatedAt: 'desc' },
    });

    for (const p of prospects) {
      const links = p.profileLinks as Record<string, unknown> | null;
      if (links?.opponentRadarProfileId === profile.id) return p;
      if (
        profile.cbfRegistration &&
        links?.cbfRegistration === profile.cbfRegistration
      ) {
        return p;
      }
    }

    const nameKey = normalizeIdentityKey(profile.displayName);
    const clubKey = normalizeIdentityKey(profile.lastKnownClub ?? '');
    if (nameKey && clubKey) {
      const hit = prospects.find(
        (p) =>
          normalizeIdentityKey(p.name) === nameKey &&
          normalizeIdentityKey(p.currentClub ?? '') === clubKey,
      );
      if (hit) return hit;
    }
    return null;
  }

  async getExecutiveIndicators(
    tenantId: string,
    periodDays: number,
    category?: string,
  ) {
    const since = new Date();
    since.setDate(since.getDate() - periodDays);
    await this.opponentRadar.ensureBackfill(tenantId);

    const season = new Date().getFullYear();
    const boston = await this.listBostonCity({ tenantId, season, category });
    const opponents = await this.listOpponentRadar({ tenantId, season, category });

    const newProfiles = await this.prisma.opponentHighlightProfile.count({
      where: {
        tenantId,
        firstSeenAt: { gte: since },
      },
    });

    return {
      season,
      topBostonCount: boston[0]?.selectionCount ?? 0,
      topBostonPlayer: boston[0]?.name ?? null,
      recurrentOpponents: opponents.filter((o) => o.highlightCount >= 2).length,
      newRadarProfiles: newProfiles,
      totalOpponentProfiles: opponents.length,
    };
  }

  async buildExportRows(tenantId: string, season: number, tab: 'boston' | 'opponent') {
    if (tab === 'boston') {
      const rows = await this.listBostonCity({ tenantId, season });
      return rows.flatMap((r) =>
        r.matches.map((m) => ({
          Atleta: r.name,
          Categoria: r.category ?? '',
          Posição: r.position ?? '',
          Temporada: r.season,
          Seleções: r.selectionCount,
          Data: m.matchDate?.slice(0, 10) ?? '',
          Adversário: m.opponent ?? '',
          Competição: m.competition ?? '',
          Placar: m.scoreLabel ?? '',
          Nota: m.rating ?? '',
          Assistências: m.assists,
          MelhorNota: m.isMatchBest ? 'Sim' : '',
          DestaqueComissão: m.isStaffStandout ? 'Sim' : '',
          Observação: m.individualReport ?? '',
        })),
      );
    }
    const rows = await this.listOpponentRadar({ tenantId, season });
    return rows.flatMap((r) =>
      r.events.map((e) => ({
        Nome: r.displayName,
        CBF: r.cbfRegistration ?? e.cbfRegistration ?? '',
        Posição: r.position ?? e.position ?? '',
        Clube: e.opponentClub ?? r.lastKnownClub ?? '',
        Temporada: season,
        Destaques: r.highlightCount,
        Data: e.matchDate?.slice(0, 10) ?? '',
        Competição: e.competition ?? '',
        Placar: e.scoreLabel ?? '',
        Camisa: e.jerseyNumber ?? '',
        NotasComissão: e.staffNotes ?? '',
        Identidade: r.identitySource,
        Confiança: r.identityConfidence,
      })),
    );
  }
}
