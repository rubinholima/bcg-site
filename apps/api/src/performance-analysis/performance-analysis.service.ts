import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { PerformanceAnalysisAccessService } from './performance-analysis-access.service';
import { DEFAULT_ANALYSIS_TAGS } from './performance-analysis.constants';
import {
  computePlayerMetrics,
  computeTeamMetrics,
} from './performance-analysis-metrics.util';

function publicVideoDto(row: {
  id: string;
  sourceType: string;
  title: string;
  cameraLabel: string | null;
  externalUrl: string | null;
  durationMs: number | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  processingStatus: string;
  createdAt: Date;
  hasPrivateUpload: boolean;
}) {
  return {
    id: row.id,
    sourceType: row.sourceType,
    title: row.title,
    cameraLabel: row.cameraLabel,
    externalUrl: row.externalUrl,
    durationMs: row.durationMs,
    mimeType: row.mimeType,
    width: row.width,
    height: row.height,
    processingStatus: row.processingStatus,
    createdAt: row.createdAt.toISOString(),
    hasPrivateUpload: row.hasPrivateUpload,
    streamUrl: row.hasPrivateUpload ? `/performance-analysis/video-sources/${row.id}/stream` : null,
  };
}

@Injectable()
export class PerformanceAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly access: PerformanceAnalysisAccessService,
  ) {}

  async ensureDefaultTags(tenantId: string) {
    const count = await this.prisma.analysisTagDefinition.count({ where: { tenantId } });
    if (count > 0) return;
    await this.prisma.analysisTagDefinition.createMany({
      data: DEFAULT_ANALYSIS_TAGS.map((t) => ({
        tenantId,
        key: t.key,
        label: t.label,
        category: t.category,
        sortOrder: t.sortOrder,
        outcomes: t.outcomes,
        active: true,
      })),
    });
  }

  async listTags(tenantId: string, allowedTenantIds: string[] | null) {
    this.access.assertTenant(allowedTenantIds, tenantId);
    await this.ensureDefaultTags(tenantId);
    return this.prisma.analysisTagDefinition.findMany({
      where: { tenantId, active: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  async listSessions(
    tenantId: string,
    allowedTenantIds: string[] | null,
    limit = 40,
  ) {
    this.access.assertTenant(allowedTenantIds, tenantId);
    const rows = await this.prisma.analysisSession.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      take: Math.min(limit, 100),
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
      fmfMatchReportId: s.fmfMatchReportId,
      travelLogisticsId: s.travelLogisticsId,
      trainingSessionId: s.trainingSessionId,
      eventCount: s._count.events,
      videoSourceCount: s._count.videoSources,
      updatedAt: s.updatedAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
    }));
  }

  async getSession(sessionId: string, allowedTenantIds: string[] | null) {
    const session = await this.access.loadSession(sessionId, allowedTenantIds);
    const [videos, tags] = await Promise.all([
      this.prisma.analysisVideoSource.findMany({
        where: { analysisSessionId: session.id },
        orderBy: { createdAt: 'asc' },
      }),
      this.listTags(session.tenantId, allowedTenantIds),
    ]);
    return {
      session: {
        ...session,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      },
      videoSources: videos.map((v) =>
        publicVideoDto({
          ...v,
          hasPrivateUpload: Boolean(v.storageKey),
        }),
      ),
      tags,
    };
  }

  async createSession(
    input: {
      tenantId: string;
      kind: string;
      title: string;
      category?: string | null;
      season?: number | null;
      fmfMatchReportId?: string | null;
      travelLogisticsId?: string | null;
      trainingSessionId?: string | null;
      authorUserId?: string | null;
    },
    allowedTenantIds: string[] | null,
  ) {
    this.access.assertTenant(allowedTenantIds, input.tenantId);
    const kind = this.access.validateSessionKind(input.kind);
    await this.access.validateSessionSources({
      tenantId: input.tenantId,
      fmfMatchReportId: input.fmfMatchReportId,
      travelLogisticsId: input.travelLogisticsId,
      trainingSessionId: input.trainingSessionId,
    });
    return this.prisma.analysisSession.create({
      data: {
        tenantId: input.tenantId,
        kind,
        title: input.title.trim(),
        status: 'active',
        category: input.category?.trim() || null,
        season: input.season ?? null,
        fmfMatchReportId: input.fmfMatchReportId?.trim() || null,
        travelLogisticsId: input.travelLogisticsId?.trim() || null,
        trainingSessionId: input.trainingSessionId?.trim() || null,
        authorUserId: input.authorUserId ?? null,
      },
    });
  }

  async addVideoSource(
    sessionId: string,
    input: {
      sourceType: string;
      title: string;
      cameraLabel?: string | null;
      externalUrl?: string | null;
      durationMs?: number | null;
      authorUserId?: string | null;
    },
    allowedTenantIds: string[] | null,
  ) {
    const session = await this.access.loadSession(sessionId, allowedTenantIds);
    const sourceType = input.sourceType.trim().toUpperCase();
    if (!['UPLOAD', 'YOUTUBE', 'EXTERNAL_URL'].includes(sourceType)) {
      throw new BadRequestException('Tipo de fonte de vídeo inválido.');
    }
    if (sourceType !== 'UPLOAD' && !input.externalUrl?.trim()) {
      throw new BadRequestException('URL externa é obrigatória para esta fonte.');
    }
    return this.prisma.analysisVideoSource.create({
      data: {
        tenantId: session.tenantId,
        analysisSessionId: session.id,
        sourceType,
        title: input.title.trim(),
        cameraLabel: input.cameraLabel?.trim() || null,
        externalUrl: input.externalUrl?.trim() || null,
        durationMs: input.durationMs ?? null,
        processingStatus: sourceType === 'UPLOAD' ? 'pending' : 'ready',
        authorUserId: input.authorUserId ?? null,
      },
    });
  }

  async uploadVideoFile(
    sessionId: string,
    videoSourceId: string,
    file: { buffer: Buffer; originalname: string; mimetype?: string },
    allowedTenantIds: string[] | null,
  ) {
    const session = await this.access.loadSession(sessionId, allowedTenantIds);
    const src = await this.access.assertVideoSourceInSession(
      videoSourceId,
      session.id,
      session.tenantId,
    );
    if (src.sourceType !== 'UPLOAD') {
      throw new BadRequestException('Esta fonte não aceita upload.');
    }
    const uploaded = await this.s3.uploadAnalysisVideo(
      file.buffer,
      session.tenantId,
      session.id,
      file.originalname,
      file.mimetype,
    );
    return this.prisma.analysisVideoSource.update({
      where: { id: src.id },
      data: {
        storageKey: uploaded.key,
        mimeType: uploaded.mimeType,
        processingStatus: 'ready',
      },
    });
  }

  async getVideoStream(videoSourceId: string, allowedTenantIds: string[] | null) {
    const src = await this.prisma.analysisVideoSource.findUnique({
      where: { id: videoSourceId },
    });
    if (!src?.storageKey) throw new NotFoundException('Vídeo não disponível.');
    this.access.assertTenant(allowedTenantIds, src.tenantId);
    const obj = await this.s3.getObject(src.storageKey);
    return { stream: obj.body, contentType: obj.contentType || src.mimeType || 'video/mp4' };
  }

  async listEvents(
    sessionId: string,
    allowedTenantIds: string[] | null,
    filters?: { playerId?: string; tagDefinitionId?: string; outcome?: string },
  ) {
    const session = await this.access.loadSession(sessionId, allowedTenantIds);
    return this.prisma.analysisEvent.findMany({
      where: {
        analysisSessionId: session.id,
        tenantId: session.tenantId,
        ...(filters?.playerId ? { playerId: filters.playerId } : {}),
        ...(filters?.tagDefinitionId ? { tagDefinitionId: filters.tagDefinitionId } : {}),
        ...(filters?.outcome ? { outcome: filters.outcome } : {}),
      },
      orderBy: [{ startMs: 'asc' }, { createdAt: 'asc' }],
      include: {
        tagDefinition: { select: { key: true, label: true } },
        player: { select: { id: true, name: true } },
      },
    });
  }

  async createEvent(
    sessionId: string,
    dto: {
      videoSourceId?: string | null;
      tagDefinitionId: string;
      playerId?: string | null;
      relatedPlayerId?: string | null;
      teamSide?: string | null;
      outcome?: string | null;
      startMs: number;
      endMs?: number | null;
      matchPeriod?: string | null;
      matchClockSeconds?: number | null;
      fieldX?: number | null;
      fieldY?: number | null;
      notes?: string | null;
      source?: string | null;
      clientEventKey?: string | null;
      authorUserId?: string | null;
    },
    allowedTenantIds: string[] | null,
  ) {
    const session = await this.access.loadSession(sessionId, allowedTenantIds);
    await this.access.assertTagInTenant(dto.tagDefinitionId, session.tenantId);
    if (dto.playerId) await this.access.assertPlayerInTenant(dto.playerId, session.tenantId);
    if (dto.relatedPlayerId) {
      await this.access.assertPlayerInTenant(dto.relatedPlayerId, session.tenantId);
    }
    if (dto.videoSourceId) {
      await this.access.assertVideoSourceInSession(
        dto.videoSourceId,
        session.id,
        session.tenantId,
      );
    }
    if (dto.clientEventKey?.trim()) {
      const existing = await this.prisma.analysisEvent.findFirst({
        where: {
          analysisSessionId: session.id,
          clientEventKey: dto.clientEventKey.trim(),
        },
      });
      if (existing) return existing;
    }
    return this.prisma.analysisEvent.create({
      data: {
        tenantId: session.tenantId,
        analysisSessionId: session.id,
        videoSourceId: dto.videoSourceId?.trim() || null,
        tagDefinitionId: dto.tagDefinitionId,
        playerId: dto.playerId?.trim() || null,
        relatedPlayerId: dto.relatedPlayerId?.trim() || null,
        teamSide: dto.teamSide?.trim() || null,
        outcome: dto.outcome?.trim() || null,
        startMs: dto.startMs,
        endMs: dto.endMs ?? null,
        matchPeriod: dto.matchPeriod?.trim() || null,
        matchClockSeconds: dto.matchClockSeconds ?? null,
        fieldX: dto.fieldX ?? null,
        fieldY: dto.fieldY ?? null,
        notes: dto.notes?.trim() || null,
        source: dto.source?.trim() || 'MANUAL',
        clientEventKey: dto.clientEventKey?.trim() || null,
        authorUserId: dto.authorUserId ?? null,
      },
      include: { tagDefinition: { select: { key: true, label: true } } },
    });
  }

  async createEventsBatch(
    sessionId: string,
    events: Array<Parameters<PerformanceAnalysisService['createEvent']>[1]>,
    allowedTenantIds: string[] | null,
  ) {
    const created: Awaited<ReturnType<PerformanceAnalysisService['createEvent']>>[] = [];
    for (const dto of events) {
      created.push(await this.createEvent(sessionId, dto, allowedTenantIds));
    }
    return { created, count: created.length };
  }

  async updateEvent(
    eventId: string,
    dto: Partial<Parameters<PerformanceAnalysisService['createEvent']>[1]>,
    allowedTenantIds: string[] | null,
  ) {
    const row = await this.prisma.analysisEvent.findUnique({ where: { id: eventId } });
    if (!row) throw new NotFoundException('Evento não encontrado.');
    this.access.assertTenant(allowedTenantIds, row.tenantId);
    if (dto.playerId) await this.access.assertPlayerInTenant(dto.playerId, row.tenantId);
    if (dto.tagDefinitionId) {
      await this.access.assertTagInTenant(dto.tagDefinitionId, row.tenantId);
    }
    return this.prisma.analysisEvent.update({
      where: { id: eventId },
      data: {
        ...(dto.tagDefinitionId ? { tagDefinitionId: dto.tagDefinitionId } : {}),
        ...(dto.playerId !== undefined ? { playerId: dto.playerId?.trim() || null } : {}),
        ...(dto.outcome !== undefined ? { outcome: dto.outcome?.trim() || null } : {}),
        ...(dto.startMs !== undefined ? { startMs: dto.startMs } : {}),
        ...(dto.endMs !== undefined ? { endMs: dto.endMs ?? null } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
      },
      include: { tagDefinition: { select: { key: true, label: true } } },
    });
  }

  async deleteEvent(eventId: string, allowedTenantIds: string[] | null) {
    const row = await this.prisma.analysisEvent.findUnique({ where: { id: eventId } });
    if (!row) throw new NotFoundException('Evento não encontrado.');
    this.access.assertTenant(allowedTenantIds, row.tenantId);
    await this.prisma.analysisEvent.delete({ where: { id: eventId } });
    return { ok: true };
  }

  async getMetrics(sessionId: string, allowedTenantIds: string[] | null) {
    const session = await this.access.loadSession(sessionId, allowedTenantIds);
    const events = await this.prisma.analysisEvent.findMany({
      where: { analysisSessionId: session.id, tenantId: session.tenantId },
      include: { tagDefinition: { select: { key: true, label: true } } },
    });
    const tagged = events.map((e) => ({
      tagKey: e.tagDefinition.key,
      tagLabel: e.tagDefinition.label,
      outcome: e.outcome,
      playerId: e.playerId,
    }));
    const playerMetrics = computePlayerMetrics(tagged);
    const playerIds = playerMetrics.map((p) => p.playerId);
    const players =
      playerIds.length > 0
        ? await this.prisma.player.findMany({
            where: { id: { in: playerIds }, tenantId: session.tenantId },
            select: { id: true, name: true },
          })
        : [];
    const nameById = new Map(players.map((p) => [p.id, p.name]));
    return {
      team: computeTeamMetrics(tagged),
      players: playerMetrics.map((p) => ({
        ...p,
        playerName: nameById.get(p.playerId) ?? null,
      })),
    };
  }

  async listClips(sessionId: string, allowedTenantIds: string[] | null) {
    const session = await this.access.loadSession(sessionId, allowedTenantIds);
    return this.prisma.analysisClip.findMany({
      where: { analysisSessionId: session.id },
      orderBy: { createdAt: 'desc' },
      include: {
        videoSource: { select: { id: true, title: true, cameraLabel: true } },
        events: { include: { event: { select: { id: true, startMs: true } } } },
        players: { include: { player: { select: { id: true, name: true } } } },
      },
    });
  }

  async createClip(
    sessionId: string,
    dto: {
      videoSourceId: string;
      title: string;
      startMs: number;
      endMs: number;
      notes?: string | null;
      eventIds?: string[];
      playerIds?: string[];
      authorUserId?: string | null;
    },
    allowedTenantIds: string[] | null,
  ) {
    const session = await this.access.loadSession(sessionId, allowedTenantIds);
    await this.access.assertVideoSourceInSession(
      dto.videoSourceId,
      session.id,
      session.tenantId,
    );
    if (dto.endMs <= dto.startMs) {
      throw new BadRequestException('Intervalo do clip inválido.');
    }
    for (const pid of dto.playerIds ?? []) {
      await this.access.assertPlayerInTenant(pid, session.tenantId);
    }
    const clip = await this.prisma.analysisClip.create({
      data: {
        tenantId: session.tenantId,
        analysisSessionId: session.id,
        videoSourceId: dto.videoSourceId,
        title: dto.title.trim(),
        startMs: dto.startMs,
        endMs: dto.endMs,
        notes: dto.notes?.trim() || null,
        authorUserId: dto.authorUserId ?? null,
      },
    });
    if (dto.eventIds?.length) {
      const valid = await this.prisma.analysisEvent.findMany({
        where: {
          id: { in: dto.eventIds },
          analysisSessionId: session.id,
          tenantId: session.tenantId,
        },
        select: { id: true },
      });
      await this.prisma.analysisClipEvent.createMany({
        data: valid.map((e) => ({ clipId: clip.id, eventId: e.id })),
        skipDuplicates: true,
      });
    }
    if (dto.playerIds?.length) {
      await this.prisma.analysisClipPlayer.createMany({
        data: dto.playerIds.map((playerId) => ({ clipId: clip.id, playerId })),
        skipDuplicates: true,
      });
    }
    return clip;
  }

  async getPlayerAnalysisSummary(
    playerId: string,
    tenantId: string,
    allowedTenantIds: string[] | null,
  ) {
    this.access.assertTenant(allowedTenantIds, tenantId);
    await this.access.assertPlayerInTenant(playerId, tenantId);
    const events = await this.prisma.analysisEvent.findMany({
      where: { tenantId, playerId },
      orderBy: { createdAt: 'desc' },
      take: 500,
      include: {
        tagDefinition: { select: { key: true, label: true } },
        analysisSession: { select: { id: true, title: true, kind: true } },
      },
    });
    const tagged = events.map((e) => ({
      tagKey: e.tagDefinition.key,
      tagLabel: e.tagDefinition.label,
      outcome: e.outcome,
      playerId: e.playerId,
    }));
    const sessions = await this.prisma.analysisSession.findMany({
      where: {
        tenantId,
        id: { in: [...new Set(events.map((e) => e.analysisSessionId))] },
      },
      select: { id: true, title: true, kind: true, updatedAt: true },
    });
    const clips = await this.prisma.analysisClip.findMany({
      where: { tenantId, players: { some: { playerId } } },
      take: 50,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, startMs: true, endMs: true, analysisSessionId: true },
    });
    return {
      sessions,
      eventCount: events.length,
      metrics: computePlayerMetrics(tagged)[0] ?? null,
      recentEvents: events.slice(0, 30),
      clips,
    };
  }
}
