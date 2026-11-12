import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { PerformanceAnalysisAccessService } from './performance-analysis-access.service';
import {
  ANALYSIS_EVENT_CLASSES,
  ANALYSIS_SESSION_STATUSES,
  ALL_DEFAULT_ANALYSIS_TAG_SEEDS,
  DEFAULT_ANALYSIS_TAGS,
} from './performance-analysis.constants';
import {
  POSSESSION_STATE_KEYS,
  planPossessionTransition,
  type PossessionTransitionTarget,
} from './possession-state.util';
import { computePossessionDurationMetrics } from './performance-analysis-possession-metrics.util';
import {
  computePlayerMetrics,
  computeTeamMetrics,
  computeTeamMetricsBySide,
} from './performance-analysis-metrics.util';
import { buildZoneHeatCounts } from './analysis-pitch-zones.util';
import {
  applyClockCommand,
  effectiveClockSeconds,
  formatClock,
  parseLiveClock,
  type LiveClockState,
} from './performance-analysis-live-clock.util';
import { normalizeTenantAnalysisTags } from './performance-analysis-tag-normalization.util';
import {
  type AnalysisPitchZoneKey,
  isValidPitchZoneKey,
  pitchZoneCentroid,
} from './analysis-pitch-zones.util';
import { ANALYSIS_TEAM_SIDES } from './performance-analysis.constants';

import { mapPublicVideoSource } from './performance-analysis-video-public.util';

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
  storageKey?: string | null;
}) {
  return mapPublicVideoSource({ ...row, storageKey: row.hasPrivateUpload ? 'private' : null });
}

@Injectable()
export class PerformanceAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly access: PerformanceAnalysisAccessService,
  ) {}

  async ensureDefaultTags(tenantId: string) {
    const existing = await this.prisma.analysisTagDefinition.findMany({
      where: { tenantId },
      select: { key: true },
    });
    const have = new Set(existing.map((r) => r.key));
    const missing = ALL_DEFAULT_ANALYSIS_TAG_SEEDS.filter((t) => !have.has(t.key));
    if (missing.length > 0) {
      await this.prisma.analysisTagDefinition.createMany({
        data: missing.map((t) => ({
          tenantId,
          key: t.key,
          label: t.label,
          category: t.category,
          tagGroup: t.tagGroup ?? null,
          sortOrder: t.sortOrder,
          outcomes: t.outcomes,
          qualifiers: t.qualifiers ?? undefined,
          color: t.color ?? null,
          active: true,
          shortcutKey: t.shortcutKey ?? null,
          requiresPlayer: t.requiresPlayer ?? false,
          requiresRelatedPlayer: t.requiresRelatedPlayer ?? false,
          requiresFieldLocation: t.requiresFieldLocation ?? false,
          stateBehavior: t.stateBehavior ?? null,
          autoClipEnabled: t.autoClipEnabled ?? false,
          autoClipPreMs: t.autoClipPreMs ?? 8000,
          autoClipPostMs: t.autoClipPostMs ?? 4000,
        })),
      });
    }
    await normalizeTenantAnalysisTags(this.prisma, tenantId);
  }

  private assertSessionMutable(status: string, forLiveTag = false) {
    if (status === 'completed') {
      throw new BadRequestException(
        'Sessão concluída. Reabra para revisão antes de alterar eventos.',
      );
    }
    if (!forLiveTag && status === 'live') {
      // review/post edits allowed in live/review/preparation
    }
  }

  private normalizeStatus(status: string): string {
    if (status === 'active' || status === 'draft') return 'preparation';
    if (status === 'archived') return 'completed';
    return status;
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
    const clock = parseLiveClock(session.liveClock);
    return {
      session: {
        ...session,
        status: this.normalizeStatus(session.status),
        liveClock: {
          ...clock,
          effectiveClockSeconds: effectiveClockSeconds(clock),
          display: formatClock(effectiveClockSeconds(clock)),
        },
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
      opponentProfileId?: string | null;
      preMatchVersionId?: string | null;
      authorUserId?: string | null;
      status?: string | null;
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
      opponentProfileId: input.opponentProfileId,
    });
    if (input.preMatchVersionId?.trim()) {
      await this.access.loadPreMatchVersion(input.preMatchVersionId.trim(), allowedTenantIds);
    }
    let status = 'preparation';
    const statusIn = input.status?.trim().toLowerCase();
    if (statusIn === 'review' && kind === 'MATCH') {
      status = 'review';
    } else if (statusIn && (ANALYSIS_SESSION_STATUSES as readonly string[]).includes(statusIn)) {
      status = statusIn;
    }

    return this.prisma.analysisSession.create({
      data: {
        tenantId: input.tenantId,
        kind,
        title: input.title.trim(),
        status,
        category: input.category?.trim() || null,
        season: input.season ?? null,
        fmfMatchReportId: input.fmfMatchReportId?.trim() || null,
        travelLogisticsId: input.travelLogisticsId?.trim() || null,
        trainingSessionId: input.trainingSessionId?.trim() || null,
        opponentProfileId: input.opponentProfileId?.trim() || null,
        preMatchVersionId: input.preMatchVersionId?.trim() || null,
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
      fieldZoneKey?: string | null;
      notes?: string | null;
      source?: string | null;
      clientEventKey?: string | null;
      authorUserId?: string | null;
      analysisClass?: string | null;
      liveCaptureStamp?: boolean | null;
      opponentPlayerId?: string | null;
    },
    allowedTenantIds: string[] | null,
  ) {
    const session = await this.access.loadSession(sessionId, allowedTenantIds);
    this.assertSessionMutable(this.normalizeStatus(session.status), dto.source === 'LIVE');
    const tag = await this.access.assertTagInTenant(dto.tagDefinitionId, session.tenantId);
    const liveStamp = Boolean(dto.liveCaptureStamp);
    if (tag.requiresPlayer && !dto.playerId?.trim() && !liveStamp) {
      throw new BadRequestException('Selecione o atleta para esta ação.');
    }
    if (dto.playerId) await this.access.assertPlayerInTenant(dto.playerId, session.tenantId);
    if (dto.relatedPlayerId) {
      await this.access.assertPlayerInTenant(dto.relatedPlayerId, session.tenantId);
    }
    if (dto.opponentPlayerId?.trim()) {
      const opp = await this.prisma.analysisOpponentPlayer.findFirst({
        where: { id: dto.opponentPlayerId.trim(), tenantId: session.tenantId },
      });
      if (!opp) throw new BadRequestException('Jogador adversário inválido para este tenant.');
      if (dto.playerId?.trim()) {
        throw new BadRequestException('Use apenas jogador do elenco ou adversário, não ambos.');
      }
    }
    if (dto.videoSourceId) {
      await this.access.assertVideoSourceInSession(
        dto.videoSourceId,
        session.id,
        session.tenantId,
      );
    }
    if (dto.analysisClass?.trim()) {
      const c = dto.analysisClass.trim().toLowerCase();
      if (!(ANALYSIS_EVENT_CLASSES as readonly string[]).includes(c)) {
        throw new BadRequestException('Classificação de análise inválida.');
      }
    }
    if (dto.fieldX != null && (dto.fieldX < 0 || dto.fieldX > 1)) {
      throw new BadRequestException('fieldX deve estar entre 0 e 1.');
    }
    if (dto.fieldY != null && (dto.fieldY < 0 || dto.fieldY > 1)) {
      throw new BadRequestException('fieldY deve estar entre 0 e 1.');
    }
    let fieldZoneKey = dto.fieldZoneKey?.trim() || null;
    if (fieldZoneKey && !isValidPitchZoneKey(fieldZoneKey)) {
      throw new BadRequestException('Zona de campo inválida.');
    }
    if (dto.teamSide?.trim()) {
      const side = dto.teamSide.trim().toLowerCase();
      if (!(ANALYSIS_TEAM_SIDES as readonly string[]).includes(side)) {
        throw new BadRequestException('Lado inválido (proprio ou adversario).');
      }
    }
    const source = dto.source?.trim() || 'MANUAL';
    if (source === 'LIVE' && !liveStamp && !fieldZoneKey && dto.fieldX == null) {
      if (tag.requiresFieldLocation) {
        throw new BadRequestException('Selecione a zona do campo (grade 3×3).');
      }
    }
    let fieldX = dto.fieldX ?? null;
    let fieldY = dto.fieldY ?? null;
    if (fieldZoneKey) {
      const c = pitchZoneCentroid(fieldZoneKey as AnalysisPitchZoneKey);
      fieldX = c.x;
      fieldY = c.y;
    }
    if (dto.clientEventKey?.trim()) {
      const existing = await this.prisma.analysisEvent.findFirst({
        where: {
          analysisSessionId: session.id,
          clientEventKey: dto.clientEventKey.trim(),
        },
        include: { tagDefinition: { select: { key: true, label: true } } },
      });
      if (existing) return existing;
    }
    const event = await this.prisma.analysisEvent.create({
      data: {
        tenantId: session.tenantId,
        analysisSessionId: session.id,
        videoSourceId: dto.videoSourceId?.trim() || null,
        tagDefinitionId: dto.tagDefinitionId,
        playerId: dto.playerId?.trim() || null,
        relatedPlayerId: dto.relatedPlayerId?.trim() || null,
        opponentPlayerId: dto.opponentPlayerId?.trim() || null,
        teamSide: dto.teamSide?.trim() || null,
        outcome: dto.outcome?.trim() || null,
        startMs: dto.startMs,
        endMs: dto.endMs ?? null,
        matchPeriod: dto.matchPeriod?.trim() || null,
        matchClockSeconds: dto.matchClockSeconds ?? null,
        fieldX,
        fieldY,
        fieldZoneKey,
        notes: dto.notes?.trim() || null,
        source,
        clientEventKey: dto.clientEventKey?.trim() || null,
        authorUserId: dto.authorUserId ?? null,
        analysisClass: dto.analysisClass?.trim().toLowerCase() || null,
      },
      include: { tagDefinition: { select: { key: true, label: true } } },
    });
    await this.maybeCreateAutoClip(session, tag, event, dto.authorUserId ?? null);
    return event;
  }

  private async maybeCreateAutoClip(
    session: { id: string; tenantId: string },
    tag: {
      autoClipEnabled: boolean;
      autoClipPreMs: number;
      autoClipPostMs: number;
      label: string;
    },
    event: { id: string; startMs: number; videoSourceId: string | null; playerId: string | null },
    authorUserId: string | null,
  ) {
    if (!tag.autoClipEnabled) return;
    let videoSourceId = event.videoSourceId;
    if (!videoSourceId) {
      const first = await this.prisma.analysisVideoSource.findFirst({
        where: { analysisSessionId: session.id, tenantId: session.tenantId },
        orderBy: { createdAt: 'asc' },
      });
      videoSourceId = first?.id ?? null;
    }
    if (!videoSourceId) return;
    const startMs = Math.max(0, event.startMs - tag.autoClipPreMs);
    const endMs = event.startMs + tag.autoClipPostMs;
    const clip = await this.prisma.analysisClip.create({
      data: {
        tenantId: session.tenantId,
        analysisSessionId: session.id,
        videoSourceId,
        title: `${tag.label} · ${formatClock(Math.floor(event.startMs / 1000))}`,
        startMs,
        endMs,
        autoGenerated: true,
        sourceEventId: event.id,
        authorUserId,
      },
    });
    await this.prisma.analysisClipEvent.create({
      data: { clipId: clip.id, eventId: event.id },
    });
    if (event.playerId) {
      await this.prisma.analysisClipPlayer.create({
        data: { clipId: clip.id, playerId: event.playerId },
      });
    }
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
    const row = await this.prisma.analysisEvent.findUnique({
      where: { id: eventId },
      include: { analysisSession: { select: { status: true } } },
    });
    if (!row) throw new NotFoundException('Evento não encontrado.');
    this.access.assertTenant(allowedTenantIds, row.tenantId);
    this.assertSessionMutable(this.normalizeStatus(row.analysisSession.status));
    if (dto.playerId) await this.access.assertPlayerInTenant(dto.playerId, row.tenantId);
    if (dto.tagDefinitionId) {
      await this.access.assertTagInTenant(dto.tagDefinitionId, row.tenantId);
    }
    if (dto.analysisClass !== undefined && dto.analysisClass?.trim()) {
      const c = dto.analysisClass.trim().toLowerCase();
      if (!(ANALYSIS_EVENT_CLASSES as readonly string[]).includes(c)) {
        throw new BadRequestException('Classificação de análise inválida.');
      }
    }
    let fieldZoneKey = dto.fieldZoneKey?.trim() || undefined;
    if (fieldZoneKey && !isValidPitchZoneKey(fieldZoneKey)) {
      throw new BadRequestException('Zona de campo inválida.');
    }
    let fieldX = dto.fieldX;
    let fieldY = dto.fieldY;
    if (fieldZoneKey) {
      const c = pitchZoneCentroid(fieldZoneKey as AnalysisPitchZoneKey);
      fieldX = c.x;
      fieldY = c.y;
    }
    return this.prisma.analysisEvent.update({
      where: { id: eventId },
      data: {
        ...(dto.tagDefinitionId ? { tagDefinitionId: dto.tagDefinitionId } : {}),
        ...(dto.playerId !== undefined ? { playerId: dto.playerId?.trim() || null } : {}),
        ...(dto.relatedPlayerId !== undefined
          ? { relatedPlayerId: dto.relatedPlayerId?.trim() || null }
          : {}),
        ...(dto.opponentPlayerId !== undefined
          ? { opponentPlayerId: dto.opponentPlayerId?.trim() || null }
          : {}),
        ...(dto.teamSide !== undefined ? { teamSide: dto.teamSide?.trim() || null } : {}),
        ...(dto.outcome !== undefined ? { outcome: dto.outcome?.trim() || null } : {}),
        ...(dto.startMs !== undefined ? { startMs: dto.startMs } : {}),
        ...(dto.endMs !== undefined ? { endMs: dto.endMs ?? null } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
        ...(dto.matchPeriod !== undefined ? { matchPeriod: dto.matchPeriod?.trim() || null } : {}),
        ...(dto.matchClockSeconds !== undefined
          ? { matchClockSeconds: dto.matchClockSeconds ?? null }
          : {}),
        ...(dto.fieldX !== undefined || fieldZoneKey ? { fieldX: fieldX ?? null } : {}),
        ...(dto.fieldY !== undefined || fieldZoneKey ? { fieldY: fieldY ?? null } : {}),
        ...(fieldZoneKey !== undefined ? { fieldZoneKey: fieldZoneKey || null } : {}),
        ...(dto.analysisClass !== undefined
          ? { analysisClass: dto.analysisClass?.trim().toLowerCase() || null }
          : {}),
      },
      include: { tagDefinition: { select: { key: true, label: true } } },
    });
  }

  async deleteEvent(eventId: string, allowedTenantIds: string[] | null) {
    const row = await this.prisma.analysisEvent.findUnique({
      where: { id: eventId },
      include: { analysisSession: { select: { status: true } } },
    });
    if (!row) throw new NotFoundException('Evento não encontrado.');
    this.access.assertTenant(allowedTenantIds, row.tenantId);
    this.assertSessionMutable(this.normalizeStatus(row.analysisSession.status));
    await this.prisma.analysisEvent.delete({ where: { id: eventId } });
    return { ok: true };
  }

  async undoLastEvent(sessionId: string, allowedTenantIds: string[] | null) {
    const session = await this.access.loadSession(sessionId, allowedTenantIds);
    this.assertSessionMutable(this.normalizeStatus(session.status));
    const last = await this.prisma.analysisEvent.findFirst({
      where: { analysisSessionId: session.id, tenantId: session.tenantId },
      orderBy: { createdAt: 'desc' },
    });
    if (!last) throw new NotFoundException('Nenhum evento para desfazer.');
    await this.prisma.analysisEvent.delete({ where: { id: last.id } });
    return { ok: true, deletedEventId: last.id };
  }

  async updateLiveClock(
    sessionId: string,
    body: {
      action: 'start' | 'pause' | 'resume' | 'reset' | 'set_period' | 'set_clock' | 'set_score';
      period?: string;
      clockSeconds?: number;
      scoreHome?: number | null;
      scoreAway?: number | null;
      videoSyncOffsetMs?: number;
    },
    allowedTenantIds: string[] | null,
  ) {
    const session = await this.access.loadSession(sessionId, allowedTenantIds);
    const current = parseLiveClock(session.liveClock);
    let next = applyClockCommand(current, body);
    if (body.videoSyncOffsetMs !== undefined) {
      next = { ...next, videoSyncOffsetMs: body.videoSyncOffsetMs };
    }
    const updated = await this.prisma.analysisSession.update({
      where: { id: session.id },
      data: { liveClock: JSON.parse(JSON.stringify(next)) },
    });
    const clock = parseLiveClock(updated.liveClock);
    return {
      liveClock: {
        ...clock,
        effectiveClockSeconds: effectiveClockSeconds(clock),
        display: formatClock(effectiveClockSeconds(clock)),
      },
    };
  }

  async transitionSessionStatus(
    sessionId: string,
    status: string,
    allowedTenantIds: string[] | null,
  ) {
    const session = await this.access.loadSession(sessionId, allowedTenantIds);
    const next = status.trim().toLowerCase();
    if (!(ANALYSIS_SESSION_STATUSES as readonly string[]).includes(next)) {
      throw new BadRequestException('Status de sessão inválido.');
    }
    const current = this.normalizeStatus(session.status);
    const allowed: Record<string, string[]> = {
      preparation: ['live', 'review', 'completed'],
      live: ['review', 'preparation', 'completed'],
      review: ['live', 'completed', 'preparation'],
      completed: ['review'],
    };
    if (!allowed[current]?.includes(next)) {
      throw new BadRequestException(`Transição ${current} → ${next} não permitida.`);
    }
    return this.prisma.analysisSession.update({
      where: { id: session.id },
      data: { status: next },
    });
  }

  async updateSessionNotes(
    sessionId: string,
    collectiveNotes: string | null,
    allowedTenantIds: string[] | null,
  ) {
    const session = await this.access.loadSession(sessionId, allowedTenantIds);
    return this.prisma.analysisSession.update({
      where: { id: session.id },
      data: { collectiveNotes: collectiveNotes?.trim() || null },
    });
  }

  async getSessionRoster(sessionId: string, allowedTenantIds: string[] | null) {
    const session = await this.access.loadSession(sessionId, allowedTenantIds);
    const players = await this.prisma.player.findMany({
      where: {
        tenantId: session.tenantId,
        ...(session.category ? { category: session.category } : {}),
      },
      select: {
        id: true,
        name: true,
        jerseyNumber: true,
        position: true,
        category: true,
      },
      orderBy: [{ jerseyNumber: 'asc' }, { name: 'asc' }],
      take: 80,
    });
    return { players, category: session.category };
  }

  async getCollectiveAnalysis(sessionId: string, allowedTenantIds: string[] | null) {
    const session = await this.access.loadSession(sessionId, allowedTenantIds);
    const [events, clips, metrics] = await Promise.all([
      this.listEvents(sessionId, allowedTenantIds),
      this.listClips(sessionId, allowedTenantIds),
      this.getMetrics(sessionId, allowedTenantIds),
    ]);
    const withField = events.filter(
      (e) => e.fieldZoneKey || (e.fieldX != null && e.fieldY != null),
    );
    return {
      session: {
        id: session.id,
        title: session.title,
        status: this.normalizeStatus(session.status),
        collectiveNotes: session.collectiveNotes,
      },
      metrics,
      events,
      clips,
      zoneHeat: buildZoneHeatCounts(events),
      fieldPoints: withField.map((e) => ({
        eventId: e.id,
        x: e.fieldX,
        y: e.fieldY,
        fieldZoneKey: e.fieldZoneKey,
        tagKey: e.tagDefinition?.key,
        playerId: e.playerId,
      })),
    };
  }

  async getIndividualAnalysis(
    sessionId: string,
    playerId: string,
    allowedTenantIds: string[] | null,
  ) {
    const session = await this.access.loadSession(sessionId, allowedTenantIds);
    await this.access.assertPlayerInTenant(playerId, session.tenantId);
    const events = await this.listEvents(sessionId, allowedTenantIds, { playerId });
    const clips = await this.prisma.analysisClip.findMany({
      where: {
        analysisSessionId: session.id,
        players: { some: { playerId } },
      },
      include: {
        videoSource: { select: { id: true, title: true } },
        events: { include: { event: { select: { id: true } } } },
      },
    });
    const tagged = events.map((e) => ({
      tagKey: e.tagDefinition?.key ?? '',
      tagLabel: e.tagDefinition?.label ?? '',
      outcome: e.outcome,
      playerId: e.playerId,
    }));
    const player = await this.prisma.player.findFirst({
      where: { id: playerId, tenantId: session.tenantId },
      select: { id: true, name: true, jerseyNumber: true, position: true },
    });
    const material = await this.prisma.analysisPlayerMaterialItem.findMany({
      where: { analysisSessionId: session.id, playerId },
      orderBy: { sortOrder: 'asc' },
    });
    return {
      player,
      metrics: computePlayerMetrics(tagged)[0] ?? null,
      events,
      clips,
      material,
      fieldPoints: events
        .filter((e) => e.fieldX != null && e.fieldY != null)
        .map((e) => ({
          eventId: e.id,
          x: e.fieldX,
          y: e.fieldY,
          fieldZoneKey: e.fieldZoneKey,
          tagKey: e.tagDefinition?.key,
        })),
      zoneHeat: buildZoneHeatCounts(events),
    };
  }

  async listPlayerMaterial(
    sessionId: string,
    playerId: string,
    allowedTenantIds: string[] | null,
  ) {
    const session = await this.access.loadSession(sessionId, allowedTenantIds);
    await this.access.assertPlayerInTenant(playerId, session.tenantId);
    return this.prisma.analysisPlayerMaterialItem.findMany({
      where: { analysisSessionId: session.id, playerId, tenantId: session.tenantId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async addPlayerMaterial(
    sessionId: string,
    dto: {
      playerId: string;
      eventId?: string | null;
      clipId?: string | null;
      notes?: string | null;
      sortOrder?: number;
      authorUserId?: string | null;
    },
    allowedTenantIds: string[] | null,
  ) {
    const session = await this.access.loadSession(sessionId, allowedTenantIds);
    await this.access.assertPlayerInTenant(dto.playerId, session.tenantId);
    if (!dto.eventId && !dto.clipId) {
      throw new BadRequestException('Informe evento ou clip.');
    }
    if (dto.eventId) {
      const ev = await this.prisma.analysisEvent.findFirst({
        where: { id: dto.eventId, analysisSessionId: session.id, tenantId: session.tenantId },
      });
      if (!ev) throw new BadRequestException('Evento inválido.');
    }
    if (dto.clipId) {
      const cl = await this.prisma.analysisClip.findFirst({
        where: { id: dto.clipId, analysisSessionId: session.id, tenantId: session.tenantId },
      });
      if (!cl) throw new BadRequestException('Clip inválido.');
    }
    const duplicate = await this.prisma.analysisPlayerMaterialItem.findFirst({
      where: {
        analysisSessionId: session.id,
        playerId: dto.playerId,
        tenantId: session.tenantId,
        OR: [
          ...(dto.eventId ? [{ eventId: dto.eventId }] : []),
          ...(dto.clipId ? [{ clipId: dto.clipId }] : []),
        ],
      },
    });
    if (duplicate) return duplicate;
    return this.prisma.analysisPlayerMaterialItem.create({
      data: {
        tenantId: session.tenantId,
        analysisSessionId: session.id,
        playerId: dto.playerId,
        eventId: dto.eventId ?? null,
        clipId: dto.clipId ?? null,
        notes: dto.notes?.trim() || null,
        sortOrder: dto.sortOrder ?? 0,
        authorUserId: dto.authorUserId ?? null,
      },
    });
  }

  async removePlayerMaterial(itemId: string, allowedTenantIds: string[] | null) {
    const row = await this.prisma.analysisPlayerMaterialItem.findUnique({ where: { id: itemId } });
    if (!row) throw new NotFoundException('Item não encontrado.');
    this.access.assertTenant(allowedTenantIds, row.tenantId);
    await this.prisma.analysisPlayerMaterialItem.delete({ where: { id: itemId } });
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
      teamSide: e.teamSide,
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
    const bySide = computeTeamMetricsBySide(tagged);
    const possession = computePossessionDurationMetrics(
      events.map((e) => ({
        tagKey: e.tagDefinition.key,
        startMs: e.startMs,
        endMs: e.endMs,
      })),
      bySide.all.possessionMarks,
    );
    return {
      team: bySide.all,
      teamProprio: bySide.proprio,
      teamAdversario: bySide.adversario,
      possession,
      zoneHeat: buildZoneHeatCounts(events),
      players: playerMetrics.map((p) => ({
        ...p,
        playerName: nameById.get(p.playerId) ?? null,
      })),
    };
  }

  async transitionPossessionState(
    sessionId: string,
    input: {
      target: PossessionTransitionTarget;
      startMs: number;
      matchPeriod?: string | null;
      matchClockSeconds?: number | null;
      videoSourceId?: string | null;
      clientEventKey?: string | null;
      authorUserId?: string | null;
    },
    allowedTenantIds: string[] | null,
  ) {
    const session = await this.access.loadSession(sessionId, allowedTenantIds);
    this.assertSessionMutable(this.normalizeStatus(session.status), true);
    await this.ensureDefaultTags(session.tenantId);

    const tagKey = POSSESSION_STATE_KEYS[input.target];
    const tags = await this.prisma.analysisTagDefinition.findMany({
      where: {
        tenantId: session.tenantId,
        key: {
          in: [
            POSSESSION_STATE_KEYS.our,
            POSSESSION_STATE_KEYS.opponent,
            POSSESSION_STATE_KEYS.out,
          ],
        },
      },
    });
    const targetTag = tags.find((t) => t.key === tagKey);
    if (!targetTag) {
      throw new BadRequestException('Tags de posse não configuradas para este tenant.');
    }

    const stateRows = await this.prisma.analysisEvent.findMany({
      where: {
        analysisSessionId: session.id,
        tenantId: session.tenantId,
        tagDefinition: {
          key: {
            in: [
              POSSESSION_STATE_KEYS.our,
              POSSESSION_STATE_KEYS.opponent,
              POSSESSION_STATE_KEYS.out,
            ],
          },
        },
      },
      include: { tagDefinition: { select: { key: true } } },
      orderBy: { startMs: 'asc' },
    });

    const openIntervals = stateRows.map((e) => ({
      eventId: e.id,
      tagKey: e.tagDefinition.key,
      startMs: e.startMs,
      endMs: e.endMs,
    }));

    const plan = planPossessionTransition(openIntervals, input.target, input.startMs, tagKey);

    if (input.clientEventKey?.trim()) {
      const dup = await this.prisma.analysisEvent.findFirst({
        where: { analysisSessionId: session.id, clientEventKey: input.clientEventKey.trim() },
      });
      if (dup) return { ok: true, event: dup, skipped: true };
    }

    return this.prisma.$transaction(async (tx) => {
      for (const id of plan.closeIds) {
        await tx.analysisEvent.update({
          where: { id },
          data: { endMs: input.startMs },
        });
      }
      if (!plan.createNew) {
        return { ok: true, created: false, closedCount: plan.closeIds.length };
      }
      const event = await tx.analysisEvent.create({
        data: {
          tenantId: session.tenantId,
          analysisSessionId: session.id,
          videoSourceId: input.videoSourceId?.trim() || null,
          tagDefinitionId: targetTag.id,
          startMs: input.startMs,
          endMs: null,
          matchPeriod: input.matchPeriod?.trim() || null,
          matchClockSeconds: input.matchClockSeconds ?? null,
          source: 'LIVE',
          clientEventKey: input.clientEventKey?.trim() || null,
          authorUserId: input.authorUserId ?? null,
          teamSide: input.target === 'our' ? 'proprio' : input.target === 'opponent' ? 'adversario' : null,
        },
        include: { tagDefinition: { select: { key: true, label: true } } },
      });
      return { ok: true, created: true, event, closedCount: plan.closeIds.length };
    });
  }

  async upsertTagDefinition(
    tenantId: string,
    body: {
      id?: string;
      key?: string;
      label: string;
      category?: string | null;
      tagGroup?: string | null;
      sortOrder?: number;
      outcomes?: string[];
      qualifiers?: string[];
      color?: string | null;
      icon?: string | null;
      shortcutKey?: string | null;
      requiresPlayer?: boolean;
      requiresRelatedPlayer?: boolean;
      requiresFieldLocation?: boolean;
      stateBehavior?: string | null;
      active?: boolean;
    },
    allowedTenantIds: string[] | null,
  ) {
    this.access.assertTenant(allowedTenantIds, tenantId);
    const key = body.key?.trim() || body.id;
    if (!key && !body.id) throw new BadRequestException('key ou id é obrigatório.');

    if (body.id) {
      const row = await this.prisma.analysisTagDefinition.findFirst({
        where: { id: body.id, tenantId },
      });
      if (!row) throw new NotFoundException('Tag não encontrada.');
      const refs = await this.prisma.analysisEvent.count({
        where: { tagDefinitionId: row.id },
      });
      if (body.active === false && refs > 0) {
        return this.prisma.analysisTagDefinition.update({
          where: { id: row.id },
          data: {
            active: false,
            archivedAt: new Date(),
          },
        });
      }
      return this.prisma.analysisTagDefinition.update({
        where: { id: row.id },
        data: {
          label: body.label.trim(),
          category: body.category?.trim() || null,
          tagGroup: body.tagGroup?.trim() || null,
          sortOrder: body.sortOrder ?? row.sortOrder,
          outcomes: body.outcomes ?? undefined,
          qualifiers: body.qualifiers ?? undefined,
          color: body.color ?? null,
          icon: body.icon ?? null,
          shortcutKey: body.shortcutKey?.trim() || null,
          requiresPlayer: body.requiresPlayer ?? row.requiresPlayer,
          requiresRelatedPlayer: body.requiresRelatedPlayer ?? row.requiresRelatedPlayer,
          requiresFieldLocation: body.requiresFieldLocation ?? row.requiresFieldLocation,
          stateBehavior: body.stateBehavior?.trim() || null,
          active: body.active ?? row.active,
        },
      });
    }

    const tagKey = body.key!.trim();
    const existing = await this.prisma.analysisTagDefinition.findFirst({
      where: { tenantId, key: tagKey },
    });
    if (existing) {
      return this.upsertTagDefinition(tenantId, { ...body, id: existing.id }, allowedTenantIds);
    }
    return this.prisma.analysisTagDefinition.create({
      data: {
        tenantId,
        key: tagKey,
        label: body.label.trim(),
        category: body.category?.trim() || null,
        tagGroup: body.tagGroup?.trim() || null,
        sortOrder: body.sortOrder ?? 500,
        outcomes: body.outcomes ?? [],
        qualifiers: body.qualifiers ?? undefined,
        color: body.color ?? null,
        icon: body.icon ?? null,
        shortcutKey: body.shortcutKey?.trim() || null,
        requiresPlayer: body.requiresPlayer ?? false,
        requiresRelatedPlayer: body.requiresRelatedPlayer ?? false,
        requiresFieldLocation: body.requiresFieldLocation ?? false,
        stateBehavior: body.stateBehavior?.trim() || null,
        active: body.active ?? true,
      },
    });
  }

  async listClipsForTenant(
    tenantId: string,
    allowedTenantIds: string[] | null,
    filters?: { playerId?: string; sessionId?: string; period?: string },
    limit = 80,
  ) {
    this.access.assertTenant(allowedTenantIds, tenantId);
    const where: Record<string, unknown> = { tenantId };
    if (filters?.sessionId) where.analysisSessionId = filters.sessionId;
    const clips = await this.prisma.analysisClip.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        analysisSession: { select: { id: true, title: true, kind: true, status: true, category: true } },
        players: { include: { player: { select: { id: true, name: true } } } },
      },
    });
    let list = clips;
    if (filters?.playerId) {
      list = list.filter((c) => c.players.some((p) => p.playerId === filters.playerId));
    }
    return list;
  }

  async getSessionOpponentRoster(sessionId: string, allowedTenantIds: string[] | null) {
    const session = await this.access.loadSession(sessionId, allowedTenantIds);
    if (!session.opponentProfileId) {
      return { players: [] as Array<{ id: string; name: string; jerseyNumber: number | null }> };
    }
    const lineup = await this.prisma.analysisOpponentLineup.findFirst({
      where: { opponentProfileId: session.opponentProfileId, isPrimary: true },
      include: {
        entries: {
          include: { opponentPlayer: { select: { id: true, name: true, shirtNumber: true } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    const players =
      lineup?.entries
        .filter((e) => e.opponentPlayer)
        .map((e) => ({
          id: e.opponentPlayer!.id,
          name: e.opponentPlayer!.name,
          jerseyNumber: e.opponentPlayer!.shirtNumber,
        })) ?? [];
    return { players };
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

  async updateClip(
    clipId: string,
    dto: { title?: string; startMs?: number; endMs?: number; notes?: string | null },
    allowedTenantIds: string[] | null,
  ) {
    const clip = await this.prisma.analysisClip.findUnique({ where: { id: clipId } });
    if (!clip) throw new NotFoundException('Clip não encontrado.');
    this.access.assertTenant(allowedTenantIds, clip.tenantId);
    if (dto.startMs != null && dto.endMs != null && dto.endMs <= dto.startMs) {
      throw new BadRequestException('Intervalo do clip inválido.');
    }
    return this.prisma.analysisClip.update({
      where: { id: clipId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.startMs !== undefined ? { startMs: dto.startMs } : {}),
        ...(dto.endMs !== undefined ? { endMs: dto.endMs } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
      },
    });
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
      teamSide: e.teamSide,
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

  async getClipPlayback(clipId: string, allowedTenantIds: string[] | null) {
    const clip = await this.prisma.analysisClip.findUnique({
      where: { id: clipId },
      include: { videoSource: true },
    });
    if (!clip) throw new NotFoundException('Clip não encontrado.');
    this.access.assertTenant(allowedTenantIds, clip.tenantId);
    return {
      clip: {
        id: clip.id,
        title: clip.title,
        startMs: clip.startMs,
        endMs: clip.endMs,
        notes: clip.notes,
        analysisSessionId: clip.analysisSessionId,
      },
      videoSource: mapPublicVideoSource(clip.videoSource),
    };
  }

  async getSeasonDashboard(
    tenantId: string,
    season: number,
    allowedTenantIds: string[] | null,
    category?: string,
  ) {
    this.access.assertTenant(allowedTenantIds, tenantId);
    const sessions = await this.prisma.analysisSession.findMany({
      where: {
        tenantId,
        kind: 'MATCH',
        season,
        ...(category?.trim() ? { category: category.trim() } : {}),
      },
      orderBy: { updatedAt: 'asc' },
      select: {
        id: true,
        title: true,
        category: true,
        liveClock: true,
        updatedAt: true,
        createdAt: true,
      },
    });
    const sessionIds = sessions.map((s) => s.id);
    const events =
      sessionIds.length === 0
        ? []
        : await this.prisma.analysisEvent.findMany({
            where: { tenantId, analysisSessionId: { in: sessionIds } },
            include: { tagDefinition: { select: { key: true, label: true } } },
          });
    const tagged = events.map((e) => ({
      tagKey: e.tagDefinition.key,
      tagLabel: e.tagDefinition.label,
      outcome: e.outcome,
      playerId: e.playerId,
      teamSide: e.teamSide,
    }));
    const bySide = computeTeamMetricsBySide(tagged);

    type MatchRow = {
      sessionId: string;
      title: string;
      scoreUs: number | null;
      scoreThem: number | null;
      result: 'V' | 'E' | 'D' | null;
      playedAt: string;
    };
    const matchRows: MatchRow[] = sessions.map((s) => {
      const clock = parseLiveClock(s.liveClock);
      const scoreUs = clock.scoreHome;
      const scoreThem = clock.scoreAway;
      let result: MatchRow['result'] = null;
      if (scoreUs != null && scoreThem != null) {
        if (scoreUs > scoreThem) result = 'V';
        else if (scoreUs < scoreThem) result = 'D';
        else result = 'E';
      }
      return {
        sessionId: s.id,
        title: s.title,
        scoreUs,
        scoreThem,
        result,
        playedAt: s.updatedAt.toISOString(),
      };
    });
    const wins = matchRows.filter((m) => m.result === 'V').length;
    const draws = matchRows.filter((m) => m.result === 'E').length;
    const losses = matchRows.filter((m) => m.result === 'D').length;
    const decided = wins + draws + losses;
    const pointsPct =
      decided > 0 ? Math.round(((wins * 3 + draws) / (decided * 3)) * 1000) / 10 : null;
    const goalsFor = matchRows.reduce((a, m) => a + (m.scoreUs ?? 0), 0);
    const goalsAgainst = matchRows.reduce((a, m) => a + (m.scoreThem ?? 0), 0);

    return {
      season,
      category: category?.trim() || null,
      matchesPlayed: sessions.length,
      wins,
      draws,
      losses,
      pointsPct,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      metrics: bySide.all,
      metricsProprio: bySide.proprio,
      metricsAdversario: bySide.adversario,
      zoneHeat: buildZoneHeatCounts(events),
      matches: matchRows,
    };
  }

  async listVideoAnnotations(
    sessionId: string,
    videoSourceId: string,
    allowedTenantIds: string[] | null,
  ) {
    const session = await this.access.loadSession(sessionId, allowedTenantIds);
    await this.access.assertVideoSourceInSession(videoSourceId, session.id, session.tenantId);
    return this.prisma.analysisVideoAnnotation.findMany({
      where: { analysisSessionId: session.id, videoSourceId },
      orderBy: { startMs: 'asc' },
    });
  }

  async createVideoAnnotation(
    sessionId: string,
    dto: {
      videoSourceId: string;
      startMs: number;
      endMs?: number | null;
      label?: string | null;
      strokes: unknown;
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
    if (!Array.isArray(dto.strokes) && typeof dto.strokes !== 'object') {
      throw new BadRequestException('Desenho inválido.');
    }
    return this.prisma.analysisVideoAnnotation.create({
      data: {
        tenantId: session.tenantId,
        analysisSessionId: session.id,
        videoSourceId: dto.videoSourceId,
        startMs: dto.startMs,
        endMs: dto.endMs ?? null,
        label: dto.label?.trim() || null,
        strokes: dto.strokes as object,
        authorUserId: dto.authorUserId ?? null,
      },
    });
  }

  async deleteVideoAnnotation(id: string, allowedTenantIds: string[] | null) {
    const row = await this.prisma.analysisVideoAnnotation.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Anotação não encontrada.');
    this.access.assertTenant(allowedTenantIds, row.tenantId);
    await this.prisma.analysisVideoAnnotation.delete({ where: { id } });
    return { ok: true };
  }
}
