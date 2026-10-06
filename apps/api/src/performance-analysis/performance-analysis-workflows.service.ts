import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PerformanceAnalysisAccessService } from './performance-analysis-access.service';
import {
  DEFAULT_OPPONENT_TACTICAL_TAGS,
  defaultPreMatchSections,
  OPPONENT_CLIP_CURATION_GROUPS,
  PRE_MATCH_LIFECYCLES,
  type PreMatchLifecycle,
} from './performance-analysis-workflows.constants';
import { buildPreMatchPrintHtml } from './performance-analysis-prematch-print.util';

@Injectable()
export class PerformanceAnalysisWorkflowsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: PerformanceAnalysisAccessService,
  ) {}

  async ensureOpponentTacticalTags(tenantId: string) {
    for (const t of DEFAULT_OPPONENT_TACTICAL_TAGS) {
      await this.prisma.analysisTagDefinition.upsert({
        where: { tenantId_key: { tenantId, key: t.key } },
        create: {
          tenantId,
          key: t.key,
          label: t.label,
          category: t.category,
          sortOrder: t.sortOrder,
          outcomes: t.outcomes,
          active: true,
        },
        update: {},
      });
    }
  }

  async listTrainingForAnalysis(
    tenantId: string,
    allowedTenantIds: string[] | null,
    filters: { category?: string; from?: string; to?: string; limit?: number },
  ) {
    this.access.assertTenant(allowedTenantIds, tenantId);
    const where: Record<string, unknown> = { tenantId };
    if (filters.category?.trim()) where.category = filters.category.trim();
    if (filters.from || filters.to) {
      where.sessionDate = {};
      if (filters.from) (where.sessionDate as Record<string, string>).gte = filters.from;
      if (filters.to) (where.sessionDate as Record<string, string>).lte = filters.to;
    }
    const limit = Math.min(filters.limit ?? 50, 100);
    const rows = await this.prisma.coachTrainingSession.findMany({
      where,
      orderBy: [{ sessionDate: 'desc' }, { startTime: 'desc' }],
      take: limit,
      include: {
        staff: { select: { id: true, name: true } },
        analysisSessions: {
          where: { kind: 'TRAINING' },
          select: { id: true, status: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
        _count: { select: { activities: true, playerEntries: true } },
      },
    });
    return rows.map((r) => ({
      trainingSessionId: r.id,
      sessionDate: r.sessionDate,
      category: r.category,
      objectives: r.objectives,
      status: r.status,
      coachName: r.staff?.name ?? null,
      analysisSession: r.analysisSessions[0] ?? null,
      activityCount: r._count.activities,
      playerCount: r._count.playerEntries,
    }));
  }

  async openTrainingAnalysis(
    trainingSessionId: string,
    allowedTenantIds: string[] | null,
    authorUserId?: string | null,
  ) {
    const training = await this.prisma.coachTrainingSession.findUnique({
      where: { id: trainingSessionId },
      include: { staff: { select: { name: true } } },
    });
    if (!training) throw new NotFoundException('Treino não encontrado.');
    this.access.assertTenant(allowedTenantIds, training.tenantId);

    const existing = await this.prisma.analysisSession.findFirst({
      where: {
        tenantId: training.tenantId,
        kind: 'TRAINING',
        trainingSessionId: training.id,
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (existing) return { session: existing, created: false };

    const title = `Treino · ${training.sessionDate}${training.category ? ` · ${training.category}` : ''}`;
    const session = await this.prisma.analysisSession.create({
      data: {
        tenantId: training.tenantId,
        kind: 'TRAINING',
        title,
        status: 'preparation',
        category: training.category,
        trainingSessionId: training.id,
        authorUserId: authorUserId ?? null,
      },
    });
    return { session, created: true };
  }

  async listOpponentProfiles(
    tenantId: string,
    allowedTenantIds: string[] | null,
    filters: { opponent?: string; category?: string; season?: number },
  ) {
    this.access.assertTenant(allowedTenantIds, tenantId);
    const where: Record<string, unknown> = { tenantId };
    if (filters.opponent?.trim()) {
      where.opponentName = { contains: filters.opponent.trim(), mode: 'insensitive' };
    }
    if (filters.category?.trim()) where.category = filters.category.trim();
    if (filters.season != null && Number.isFinite(filters.season)) where.season = filters.season;

    return this.prisma.analysisOpponentProfile.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 80,
      include: {
        _count: {
          select: { observedMatches: true, players: true, analysisSessions: true },
        },
      },
    });
  }

  async createOpponentProfile(
    input: {
      tenantId: string;
      opponentName: string;
      visitingTeamId?: string | null;
      category?: string | null;
      season?: number | null;
    },
    allowedTenantIds: string[] | null,
  ) {
    this.access.assertTenant(allowedTenantIds, input.tenantId);
    await this.ensureOpponentTacticalTags(input.tenantId);
    const profile = await this.prisma.analysisOpponentProfile.create({
      data: {
        tenantId: input.tenantId,
        opponentName: input.opponentName.trim(),
        visitingTeamId: input.visitingTeamId?.trim() || null,
        category: input.category?.trim() || null,
        season: input.season ?? null,
      },
    });
    return profile;
  }

  async getOpponentProfileBundle(profileId: string, allowedTenantIds: string[] | null) {
    const profile = await this.access.loadOpponentProfile(profileId, allowedTenantIds);
    const [observedMatches, players, lineups, setPieces, sessions, clipCollection] =
      await Promise.all([
        this.prisma.analysisOpponentObservedMatch.findMany({
          where: { opponentProfileId: profile.id },
          orderBy: [{ sortOrder: 'asc' }, { matchDate: 'desc' }],
          include: { videoLinks: { include: { videoSource: { select: { id: true, title: true } } } } },
        }),
        this.prisma.analysisOpponentPlayer.findMany({
          where: { opponentProfileId: profile.id },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        }),
        this.prisma.analysisOpponentLineup.findMany({
          where: { opponentProfileId: profile.id },
          include: { entries: { orderBy: { sortOrder: 'asc' } } },
        }),
        this.prisma.analysisOpponentSetPiece.findMany({
          where: { opponentProfileId: profile.id },
          orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }],
        }),
        this.prisma.analysisSession.findMany({
          where: { opponentProfileId: profile.id, kind: 'OPPONENT' },
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.analysisClipCollection.findFirst({
          where: { opponentProfileId: profile.id },
          include: {
            items: {
              orderBy: [{ groupKey: 'asc' }, { sortOrder: 'asc' }],
              include: {
                clip: {
                  select: {
                    id: true,
                    title: true,
                    startMs: true,
                    endMs: true,
                    analysisSessionId: true,
                  },
                },
              },
            },
          },
        }),
      ]);
    return {
      profile,
      observedMatches,
      players,
      lineups,
      setPieces,
      sessions,
      clipCollection,
      clipGroups: OPPONENT_CLIP_CURATION_GROUPS,
    };
  }

  async updateOpponentProfile(
    profileId: string,
    patch: Record<string, unknown>,
    allowedTenantIds: string[] | null,
  ) {
    await this.access.loadOpponentProfile(profileId, allowedTenantIds);
    const allowed = [
      'notes',
      'preferredFormations',
      'alternativeFormations',
      'buildUpPatterns',
      'attackingPatterns',
      'defensiveOrganization',
      'pressingBehavior',
      'transitions',
      'setPiecesSummary',
      'strengths',
      'weaknesses',
      'keyObservations',
      'extraProfile',
      'visitingTeamId',
      'category',
      'season',
    ];
    const data: Record<string, unknown> = {};
    for (const k of allowed) {
      if (k in patch) data[k] = patch[k];
    }
    return this.prisma.analysisOpponentProfile.update({
      where: { id: profileId },
      data: data as Parameters<typeof this.prisma.analysisOpponentProfile.update>[0]['data'],
    });
  }

  async openOpponentAnalysisSession(
    profileId: string,
    allowedTenantIds: string[] | null,
    authorUserId?: string | null,
  ) {
    const profile = await this.access.loadOpponentProfile(profileId, allowedTenantIds);
    await this.ensureOpponentTacticalTags(profile.tenantId);
    const existing = await this.prisma.analysisSession.findFirst({
      where: { tenantId: profile.tenantId, kind: 'OPPONENT', opponentProfileId: profile.id },
      orderBy: { updatedAt: 'desc' },
    });
    if (existing) return { session: existing, created: false };

    const session = await this.prisma.analysisSession.create({
      data: {
        tenantId: profile.tenantId,
        kind: 'OPPONENT',
        title: `Adversário · ${profile.opponentName}`,
        status: 'preparation',
        category: profile.category,
        season: profile.season,
        opponentProfileId: profile.id,
        authorUserId: authorUserId ?? null,
      },
    });
    await this.ensureClipCollection(profile.tenantId, profile.id, session.id);
    return { session, created: true };
  }

  private async ensureClipCollection(tenantId: string, profileId: string, sessionId: string) {
    const existing = await this.prisma.analysisClipCollection.findFirst({
      where: { opponentProfileId: profileId },
    });
    if (existing) return existing;
    return this.prisma.analysisClipCollection.create({
      data: {
        tenantId,
        opponentProfileId: profileId,
        analysisSessionId: sessionId,
        title: 'Clips curados',
      },
    });
  }

  async addObservedMatch(
    profileId: string,
    dto: {
      facedOpponentName?: string | null;
      matchDate?: string | null;
      competition?: string | null;
      homeAway?: string | null;
      homeScore?: number | null;
      awayScore?: number | null;
      sourceReference?: string | null;
      notes?: string | null;
      fmfMatchReportId?: string | null;
      travelLogisticsId?: string | null;
    },
    allowedTenantIds: string[] | null,
  ) {
    const profile = await this.access.loadOpponentProfile(profileId, allowedTenantIds);
    if (dto.fmfMatchReportId?.trim()) {
      const row = await this.prisma.fmfMatchReport.findFirst({
        where: { id: dto.fmfMatchReportId.trim(), tenantId: profile.tenantId },
      });
      if (!row) throw new BadRequestException('Partida FMF inválida.');
    }
    if (dto.travelLogisticsId?.trim()) {
      const row = await this.prisma.travelLogistics.findFirst({
        where: { id: dto.travelLogisticsId.trim(), tenantId: profile.tenantId },
      });
      if (!row) throw new BadRequestException('Viagem inválida.');
    }
    return this.prisma.analysisOpponentObservedMatch.create({
      data: {
        tenantId: profile.tenantId,
        opponentProfileId: profile.id,
        facedOpponentName: dto.facedOpponentName?.trim() || null,
        matchDate: dto.matchDate?.trim() || null,
        competition: dto.competition?.trim() || null,
        homeAway: dto.homeAway?.trim() || null,
        homeScore: dto.homeScore ?? null,
        awayScore: dto.awayScore ?? null,
        sourceReference: dto.sourceReference?.trim() || null,
        notes: dto.notes?.trim() || null,
        fmfMatchReportId: dto.fmfMatchReportId?.trim() || null,
        travelLogisticsId: dto.travelLogisticsId?.trim() || null,
      },
    });
  }

  async linkObservedMatchVideo(
    observedMatchId: string,
    videoSourceId: string,
    allowedTenantIds: string[] | null,
  ) {
    const match = await this.prisma.analysisOpponentObservedMatch.findUnique({
      where: { id: observedMatchId },
    });
    if (!match) throw new NotFoundException('Jogo observado não encontrado.');
    this.access.assertTenant(allowedTenantIds, match.tenantId);
    const src = await this.prisma.analysisVideoSource.findFirst({
      where: { id: videoSourceId, tenantId: match.tenantId },
    });
    if (!src) throw new BadRequestException('Vídeo inválido.');
    const session = await this.prisma.analysisSession.findFirst({
      where: { id: src.analysisSessionId, opponentProfileId: match.opponentProfileId },
    });
    if (!session) {
      throw new BadRequestException('Vídeo não pertence à análise deste adversário.');
    }
    await this.prisma.analysisOpponentObservedMatchVideo.upsert({
      where: { observedMatchId_videoSourceId: { observedMatchId, videoSourceId } },
      create: { observedMatchId, videoSourceId },
      update: {},
    });
    return { ok: true };
  }

  async upsertOpponentPlayer(
    profileId: string,
    dto: {
      id?: string;
      name: string;
      shirtNumber?: number | null;
      position?: string | null;
      likelyStarter?: boolean;
      tacticalRole?: string | null;
      strengths?: string | null;
      weaknesses?: string | null;
      observations?: string | null;
      sortOrder?: number;
    },
    allowedTenantIds: string[] | null,
  ) {
    const profile = await this.access.loadOpponentProfile(profileId, allowedTenantIds);
    const data = {
      tenantId: profile.tenantId,
      opponentProfileId: profile.id,
      name: dto.name.trim(),
      shirtNumber: dto.shirtNumber ?? null,
      position: dto.position?.trim() || null,
      likelyStarter: dto.likelyStarter ?? false,
      tacticalRole: dto.tacticalRole?.trim() || null,
      strengths: dto.strengths?.trim() || null,
      weaknesses: dto.weaknesses?.trim() || null,
      observations: dto.observations?.trim() || null,
      sortOrder: dto.sortOrder ?? 0,
    };
    if (dto.id?.trim()) {
      const row = await this.prisma.analysisOpponentPlayer.findFirst({
        where: { id: dto.id.trim(), opponentProfileId: profile.id, tenantId: profile.tenantId },
      });
      if (!row) throw new BadRequestException('Jogador adversário inválido.');
      return this.prisma.analysisOpponentPlayer.update({ where: { id: row.id }, data });
    }
    const dup = await this.prisma.analysisOpponentPlayer.findFirst({
      where: {
        opponentProfileId: profile.id,
        name: data.name,
        shirtNumber: data.shirtNumber,
      },
    });
    if (dup) {
      return this.prisma.analysisOpponentPlayer.update({ where: { id: dup.id }, data });
    }
    return this.prisma.analysisOpponentPlayer.create({ data });
  }

  async saveProbableLineup(
    profileId: string,
    dto: {
      lineupId?: string;
      formation?: string | null;
      label?: string;
      notes?: string | null;
      entries: Array<{
        id?: string;
        opponentPlayerId?: string | null;
        name: string;
        shirtNumber?: number | null;
        position?: string | null;
        fieldX?: number | null;
        fieldY?: number | null;
        isStarter?: boolean;
        confidence?: string | null;
        notes?: string | null;
        sortOrder?: number;
      }>;
    },
    allowedTenantIds: string[] | null,
  ) {
    const profile = await this.access.loadOpponentProfile(profileId, allowedTenantIds);
    let lineup = dto.lineupId
      ? await this.prisma.analysisOpponentLineup.findFirst({
          where: { id: dto.lineupId, opponentProfileId: profile.id },
        })
      : null;
    if (dto.lineupId && !lineup) throw new BadRequestException('Escalação inválida.');
    if (!lineup) {
      await this.prisma.analysisOpponentLineup.updateMany({
        where: { opponentProfileId: profile.id, isPrimary: true },
        data: { isPrimary: false },
      });
      lineup = await this.prisma.analysisOpponentLineup.create({
        data: {
          tenantId: profile.tenantId,
          opponentProfileId: profile.id,
          formation: dto.formation?.trim() || null,
          label: dto.label?.trim() || 'Provável',
          notes: dto.notes?.trim() || null,
          isPrimary: true,
        },
      });
    } else {
      lineup = await this.prisma.analysisOpponentLineup.update({
        where: { id: lineup.id },
        data: {
          formation: dto.formation?.trim() || null,
          notes: dto.notes?.trim() || null,
        },
      });
    }
    await this.prisma.analysisOpponentLineupEntry.deleteMany({ where: { lineupId: lineup.id } });
    if (dto.entries.length > 0) {
      await this.prisma.analysisOpponentLineupEntry.createMany({
        data: dto.entries.map((e, i) => ({
          lineupId: lineup!.id,
          opponentPlayerId: e.opponentPlayerId?.trim() || null,
          name: e.name.trim(),
          shirtNumber: e.shirtNumber ?? null,
          position: e.position?.trim() || null,
          fieldX: e.fieldX ?? null,
          fieldY: e.fieldY ?? null,
          isStarter: e.isStarter ?? true,
          confidence: e.confidence?.trim() || null,
          notes: e.notes?.trim() || null,
          sortOrder: e.sortOrder ?? i,
        })),
      });
    }
    return this.prisma.analysisOpponentLineup.findUnique({
      where: { id: lineup.id },
      include: { entries: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async upsertSetPiece(
    profileId: string,
    dto: {
      id?: string;
      kind: string;
      title?: string | null;
      notes?: string | null;
      fieldX?: number | null;
      fieldY?: number | null;
      eventId?: string | null;
      clipId?: string | null;
      sortOrder?: number;
    },
    allowedTenantIds: string[] | null,
  ) {
    const profile = await this.access.loadOpponentProfile(profileId, allowedTenantIds);
    if (dto.clipId?.trim()) {
      await this.access.assertClipInTenant(dto.clipId.trim(), profile.tenantId);
    }
    const data = {
      tenantId: profile.tenantId,
      opponentProfileId: profile.id,
      kind: dto.kind.trim(),
      title: dto.title?.trim() || null,
      notes: dto.notes?.trim() || null,
      fieldX: dto.fieldX ?? null,
      fieldY: dto.fieldY ?? null,
      eventId: dto.eventId?.trim() || null,
      clipId: dto.clipId?.trim() || null,
      sortOrder: dto.sortOrder ?? 0,
    };
    if (dto.id?.trim()) {
      return this.prisma.analysisOpponentSetPiece.update({
        where: { id: dto.id.trim() },
        data,
      });
    }
    return this.prisma.analysisOpponentSetPiece.create({ data });
  }

  async curateClip(
    profileId: string,
    dto: { clipId: string; groupKey: string; sortOrder?: number },
    allowedTenantIds: string[] | null,
  ) {
    const profile = await this.access.loadOpponentProfile(profileId, allowedTenantIds);
    const clip = await this.access.assertClipInTenant(dto.clipId, profile.tenantId);
    const session = await this.prisma.analysisSession.findFirst({
      where: { id: clip.analysisSessionId, opponentProfileId: profile.id },
    });
    if (!session) throw new BadRequestException('Clip não pertence a esta análise de adversário.');
    let collection = await this.prisma.analysisClipCollection.findFirst({
      where: { opponentProfileId: profile.id },
    });
    if (!collection) {
      collection = await this.ensureClipCollection(profile.tenantId, profile.id, session.id);
    }
    const existing = await this.prisma.analysisClipCollectionItem.findUnique({
      where: { collectionId_clipId: { collectionId: collection.id, clipId: dto.clipId } },
    });
    if (existing) {
      return this.prisma.analysisClipCollectionItem.update({
        where: { id: existing.id },
        data: { groupKey: dto.groupKey, sortOrder: dto.sortOrder ?? existing.sortOrder },
      });
    }
    return this.prisma.analysisClipCollectionItem.create({
      data: {
        collectionId: collection.id,
        clipId: dto.clipId,
        groupKey: dto.groupKey,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async removeCuratedClip(itemId: string, allowedTenantIds: string[] | null) {
    const item = await this.prisma.analysisClipCollectionItem.findUnique({
      where: { id: itemId },
      include: { collection: true },
    });
    if (!item) throw new NotFoundException('Item não encontrado.');
    this.access.assertTenant(allowedTenantIds, item.collection.tenantId);
    await this.prisma.analysisClipCollectionItem.delete({ where: { id: itemId } });
    return { ok: true };
  }

  // ─── Pré-jogo ─────────────────────────────────────────────────────────────

  async listPreMatchPreparations(
    tenantId: string,
    allowedTenantIds: string[] | null,
    filters: { opponent?: string; category?: string; from?: string; to?: string },
  ) {
    this.access.assertTenant(allowedTenantIds, tenantId);
    const where: Record<string, unknown> = { tenantId };
    if (filters.opponent?.trim()) {
      where.opponentName = { contains: filters.opponent.trim(), mode: 'insensitive' };
    }
    if (filters.category?.trim()) where.category = filters.category.trim();
    if (filters.from || filters.to) {
      where.matchDate = {};
      if (filters.from) (where.matchDate as Record<string, string>).gte = filters.from;
      if (filters.to) (where.matchDate as Record<string, string>).lte = filters.to;
    }
    return this.prisma.analysisPreMatchPreparation.findMany({
      where,
      orderBy: [{ matchDate: 'desc' }, { updatedAt: 'desc' }],
      take: 60,
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        opponentProfile: { select: { id: true, opponentName: true } },
      },
    });
  }

  async createPreMatchFromTravel(
    travelLogisticsId: string,
    allowedTenantIds: string[] | null,
    authorUserId?: string | null,
  ) {
    const travel = await this.prisma.travelLogistics.findUnique({
      where: { id: travelLogisticsId },
    });
    if (!travel) throw new NotFoundException('Viagem não encontrada.');
    this.access.assertTenant(allowedTenantIds, travel.tenantId);

    let opponentProfileId: string | null = null;
    if (travel.opponentName?.trim()) {
      const existing = await this.prisma.analysisOpponentProfile.findFirst({
        where: {
          tenantId: travel.tenantId,
          opponentName: { equals: travel.opponentName.trim(), mode: 'insensitive' },
          category: travel.category ?? undefined,
        },
      });
      if (existing) {
        opponentProfileId = existing.id;
      } else {
        const created = await this.createOpponentProfile(
          {
            tenantId: travel.tenantId,
            opponentName: travel.opponentName.trim(),
            category: travel.category,
          },
          allowedTenantIds,
        );
        opponentProfileId = created.id;
      }
    }

    const matchDate = travel.matchDate.toISOString().slice(0, 10);
    const title = `Pré-jogo · ${travel.opponentName ?? 'Adversário'} · ${matchDate}`;
    const prep = await this.prisma.analysisPreMatchPreparation.create({
      data: {
        tenantId: travel.tenantId,
        title,
        opponentName: travel.opponentName,
        category: travel.category,
        matchDate,
        travelLogisticsId: travel.id,
        opponentProfileId,
      },
    });
    const version = await this.createPreMatchVersionDraft(prep.id, allowedTenantIds, authorUserId);
    return { preparation: prep, version };
  }

  async createPreMatchVersionDraft(
    preparationId: string,
    allowedTenantIds: string[] | null,
    authorUserId?: string | null,
  ) {
    const prep = await this.prisma.analysisPreMatchPreparation.findUnique({
      where: { id: preparationId },
    });
    if (!prep) throw new NotFoundException('Preparação não encontrada.');
    this.access.assertTenant(allowedTenantIds, prep.tenantId);
    const last = await this.prisma.analysisPreMatchVersion.findFirst({
      where: { preparationId },
      orderBy: { versionNumber: 'desc' },
    });
    const versionNumber = (last?.versionNumber ?? 0) + 1;
    return this.prisma.analysisPreMatchVersion.create({
      data: {
        preparationId,
        versionNumber,
        lifecycle: 'DRAFT',
        sections: defaultPreMatchSections(),
        hiddenSections: [],
        tacticalBoard: { elements: [] },
        selectedClipIds: [],
        analystNotes: authorUserId ? null : null,
      },
    });
  }

  async getPreMatchBundle(preparationId: string, allowedTenantIds: string[] | null) {
    const prep = await this.prisma.analysisPreMatchPreparation.findUnique({
      where: { id: preparationId },
      include: {
        versions: { orderBy: { versionNumber: 'desc' } },
        opponentProfile: true,
        travelLogistics: {
          select: {
            id: true,
            opponentName: true,
            matchDate: true,
            category: true,
            championshipName: true,
            isHomeMatch: true,
            stadiumName: true,
          },
        },
      },
    });
    if (!prep) throw new NotFoundException('Preparação não encontrada.');
    this.access.assertTenant(allowedTenantIds, prep.tenantId);
    return prep;
  }

  assertLifecycleTransition(from: string, to: string) {
    const f = from.toUpperCase() as PreMatchLifecycle;
    const t = to.toUpperCase() as PreMatchLifecycle;
    if (!(PRE_MATCH_LIFECYCLES as readonly string[]).includes(t)) {
      throw new BadRequestException('Status de pré-jogo inválido.');
    }
    const allowed: Record<PreMatchLifecycle, PreMatchLifecycle[]> = {
      DRAFT: ['REVIEW', 'DRAFT'],
      REVIEW: ['DRAFT', 'APPROVED'],
      APPROVED: ['PRESENTED'],
      PRESENTED: ['PRESENTED'],
    };
    if (!allowed[f]?.includes(t)) {
      throw new BadRequestException(`Transição ${f} → ${t} não permitida.`);
    }
  }

  async updatePreMatchVersion(
    versionId: string,
    patch: {
      sections?: unknown;
      hiddenSections?: unknown;
      tacticalBoard?: unknown;
      selectedClipIds?: unknown;
      analystNotes?: string | null;
      staffNotes?: string | null;
    },
    allowedTenantIds: string[] | null,
  ) {
    const version = await this.access.loadPreMatchVersion(versionId, allowedTenantIds);
    if (version.lifecycle === 'APPROVED' || version.lifecycle === 'PRESENTED') {
      throw new ForbiddenException(
        'Versão aprovada/apresentada não pode ser alterada. Crie uma nova versão.',
      );
    }
    if (Array.isArray(patch.selectedClipIds)) {
      for (const clipId of patch.selectedClipIds) {
        await this.access.assertClipInTenant(String(clipId), version.preparation.tenantId);
      }
    }
    const data: Prisma.AnalysisPreMatchVersionUpdateInput = {};
    if (patch.sections !== undefined) {
      data.sections = patch.sections as Prisma.InputJsonValue;
    }
    if (patch.hiddenSections !== undefined) {
      data.hiddenSections = patch.hiddenSections as Prisma.InputJsonValue;
    }
    if (patch.tacticalBoard !== undefined) {
      data.tacticalBoard = patch.tacticalBoard as Prisma.InputJsonValue;
    }
    if (patch.selectedClipIds !== undefined) {
      data.selectedClipIds = patch.selectedClipIds as Prisma.InputJsonValue;
    }
    if (patch.analystNotes !== undefined) data.analystNotes = patch.analystNotes;
    if (patch.staffNotes !== undefined) data.staffNotes = patch.staffNotes;
    return this.prisma.analysisPreMatchVersion.update({ where: { id: versionId }, data });
  }

  async transitionPreMatchVersion(
    versionId: string,
    lifecycle: string,
    allowedTenantIds: string[] | null,
    actorUserId?: string | null,
  ) {
    const version = await this.access.loadPreMatchVersion(versionId, allowedTenantIds);
    const next = lifecycle.trim().toUpperCase();
    this.assertLifecycleTransition(version.lifecycle, next);
    const data: Record<string, unknown> = { lifecycle: next };
    if (next === 'APPROVED') {
      data.approvedAt = new Date();
      data.approvedBy = actorUserId ?? null;
    }
    if (next === 'PRESENTED') {
      data.presentedAt = new Date();
      data.presentedBy = actorUserId ?? null;
    }
    return this.prisma.analysisPreMatchVersion.update({ where: { id: versionId }, data });
  }

  async exportPreMatchHtml(versionId: string, allowedTenantIds: string[] | null) {
    const version = await this.access.loadPreMatchVersion(versionId, allowedTenantIds);
    const prep = await this.getPreMatchBundle(version.preparationId, allowedTenantIds);
    const profileBundle = prep.opponentProfileId
      ? await this.getOpponentProfileBundle(prep.opponentProfileId, allowedTenantIds)
      : null;
    return buildPreMatchPrintHtml({ preparation: prep, version, profileBundle });
  }

  async linkMatchSessionToPreMatch(
    sessionId: string,
    preMatchVersionId: string,
    allowedTenantIds: string[] | null,
  ) {
    const session = await this.access.loadSession(sessionId, allowedTenantIds);
    if (session.kind !== 'MATCH') {
      throw new BadRequestException('Vínculo de pré-jogo só se aplica a sessões de partida.');
    }
    const version = await this.access.loadPreMatchVersion(preMatchVersionId, allowedTenantIds);
    if (version.preparation.tenantId !== session.tenantId) {
      throw new ForbiddenException('Pré-jogo de outro clube.');
    }
    return this.prisma.analysisSession.update({
      where: { id: session.id },
      data: { preMatchVersionId: version.id },
    });
  }

  async listSessionsFiltered(
    tenantId: string,
    allowedTenantIds: string[] | null,
    filters: {
      kind?: string;
      status?: string;
      category?: string;
      season?: number;
      opponentProfileId?: string;
      limit?: number;
    },
  ) {
    this.access.assertTenant(allowedTenantIds, tenantId);
    const where: Record<string, unknown> = { tenantId };
    if (filters.kind?.trim()) where.kind = filters.kind.trim().toUpperCase();
    if (filters.status?.trim()) where.status = filters.status.trim();
    if (filters.category?.trim()) where.category = filters.category.trim();
    if (filters.season != null && Number.isFinite(filters.season)) where.season = filters.season;
    if (filters.opponentProfileId?.trim()) where.opponentProfileId = filters.opponentProfileId.trim();
    const limit = Math.min(filters.limit ?? 40, 100);
    const rows = await this.prisma.analysisSession.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: { _count: { select: { events: true, videoSources: true } } },
    });
    return rows.map((s) => ({
      id: s.id,
      tenantId: s.tenantId,
      kind: s.kind,
      title: s.title,
      status: s.status,
      category: s.category,
      season: s.season,
      opponentProfileId: s.opponentProfileId,
      trainingSessionId: s.trainingSessionId,
      preMatchVersionId: s.preMatchVersionId,
      eventCount: s._count.events,
      videoSourceCount: s._count.videoSources,
      updatedAt: s.updatedAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    }));
  }
}
