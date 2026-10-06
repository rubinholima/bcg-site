import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Header,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { TenantAccessService } from '../auth/tenant-access.service';
import { PerformanceAnalysisService } from './performance-analysis.service';
import { PerformanceAnalysisWorkflowsService } from './performance-analysis-workflows.service';

type AuthedRequest = Request & { user: CognitoJwtPayload };

@Controller('performance-analysis')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('futebol_analise_desempenho')
export class PerformanceAnalysisController {
  constructor(
    private readonly service: PerformanceAnalysisService,
    private readonly workflows: PerformanceAnalysisWorkflowsService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private async allowed(req: AuthedRequest) {
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    return this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
  }

  private userId(req: AuthedRequest) {
    return req.user.sub;
  }

  @Get('tags')
  async listTags(@Req() req: AuthedRequest, @Query('tenantId') tenantId: string) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório.');
    return this.service.listTags(tenantId.trim(), await this.allowed(req));
  }

  @Get('sessions')
  async listSessions(
    @Req() req: AuthedRequest,
    @Query('tenantId') tenantId: string,
    @Query('limit') limitRaw?: string,
    @Query('kind') kind?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('season') seasonRaw?: string,
    @Query('opponentProfileId') opponentProfileId?: string,
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório.');
    const limit = limitRaw?.trim() ? Number(limitRaw) : 40;
    const season = seasonRaw?.trim() ? Number(seasonRaw) : undefined;
    if (kind || status || category || seasonRaw || opponentProfileId) {
      return this.workflows.listSessionsFiltered(tenantId.trim(), await this.allowed(req), {
        kind,
        status,
        category,
        season: Number.isFinite(season) ? season : undefined,
        opponentProfileId,
        limit,
      });
    }
    return this.service.listSessions(tenantId.trim(), await this.allowed(req), limit);
  }

  @Get('sessions/:sessionId')
  async getSession(@Req() req: AuthedRequest, @Param('sessionId') sessionId: string) {
    return this.service.getSession(sessionId, await this.allowed(req));
  }

  @Post('sessions')
  async createSession(
    @Req() req: AuthedRequest,
    @Body()
    body: {
      tenantId: string;
      kind: string;
      title: string;
      category?: string;
      season?: number;
      fmfMatchReportId?: string;
      travelLogisticsId?: string;
      trainingSessionId?: string;
    },
  ) {
    if (!body?.tenantId?.trim() || !body.title?.trim()) {
      throw new BadRequestException('tenantId e title são obrigatórios.');
    }
    return this.service.createSession(
      { ...body, authorUserId: this.userId(req) },
      await this.allowed(req),
    );
  }

  @Post('sessions/:sessionId/video-sources')
  async addVideoSource(
    @Req() req: AuthedRequest,
    @Param('sessionId') sessionId: string,
    @Body()
    body: {
      sourceType: string;
      title: string;
      cameraLabel?: string;
      externalUrl?: string;
      durationMs?: number;
    },
  ) {
    return this.service.addVideoSource(
      sessionId,
      { ...body, authorUserId: this.userId(req) },
      await this.allowed(req),
    );
  }

  @Post('sessions/:sessionId/video-sources/:videoSourceId/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(
    @Req() req: AuthedRequest,
    @Param('sessionId') sessionId: string,
    @Param('videoSourceId') videoSourceId: string,
    @UploadedFile() file?: { buffer: Buffer; originalname: string; mimetype?: string },
  ) {
    if (!file?.buffer) throw new BadRequestException('Envie o arquivo (campo file).');
    return this.service.uploadVideoFile(
      sessionId,
      videoSourceId,
      file,
      await this.allowed(req),
    );
  }

  @Get('video-sources/:videoSourceId/stream')
  @Header('Cache-Control', 'private, no-store')
  async streamVideo(
    @Req() req: AuthedRequest,
    @Param('videoSourceId') videoSourceId: string,
    @Res() res: Response,
  ) {
    const { stream, contentType } = await this.service.getVideoStream(
      videoSourceId,
      await this.allowed(req),
    );
    res.setHeader('Content-Type', contentType);
    stream.pipe(res);
  }

  @Get('sessions/:sessionId/events')
  async listEvents(
    @Req() req: AuthedRequest,
    @Param('sessionId') sessionId: string,
    @Query('playerId') playerId?: string,
    @Query('tagDefinitionId') tagDefinitionId?: string,
    @Query('outcome') outcome?: string,
  ) {
    return this.service.listEvents(sessionId, await this.allowed(req), {
      playerId,
      tagDefinitionId,
      outcome,
    });
  }

  @Post('sessions/:sessionId/events')
  async createEvent(
    @Req() req: AuthedRequest,
    @Param('sessionId') sessionId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.createEvent(
      sessionId,
      { ...(body as object), authorUserId: this.userId(req) } as Parameters<
        PerformanceAnalysisService['createEvent']
      >[1],
      await this.allowed(req),
    );
  }

  @Post('sessions/:sessionId/events/batch')
  async createEventsBatch(
    @Req() req: AuthedRequest,
    @Param('sessionId') sessionId: string,
    @Body() body: { events: Array<Record<string, unknown>> },
  ) {
    const events = (body.events ?? []).map((e) => ({
      ...e,
      authorUserId: this.userId(req),
    })) as Parameters<PerformanceAnalysisService['createEvent']>[1][];
    return this.service.createEventsBatch(sessionId, events, await this.allowed(req));
  }

  @Patch('events/:eventId')
  async updateEvent(
    @Req() req: AuthedRequest,
    @Param('eventId') eventId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.updateEvent(
      eventId,
      body as Partial<Parameters<PerformanceAnalysisService['createEvent']>[1]>,
      await this.allowed(req),
    );
  }

  @Delete('events/:eventId')
  async deleteEvent(@Req() req: AuthedRequest, @Param('eventId') eventId: string) {
    return this.service.deleteEvent(eventId, await this.allowed(req));
  }

  @Get('sessions/:sessionId/metrics')
  async getMetrics(@Req() req: AuthedRequest, @Param('sessionId') sessionId: string) {
    return this.service.getMetrics(sessionId, await this.allowed(req));
  }

  @Get('sessions/:sessionId/clips')
  async listClips(@Req() req: AuthedRequest, @Param('sessionId') sessionId: string) {
    return this.service.listClips(sessionId, await this.allowed(req));
  }

  @Post('sessions/:sessionId/clips')
  async createClip(
    @Req() req: AuthedRequest,
    @Param('sessionId') sessionId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.createClip(
      sessionId,
      { ...(body as object), authorUserId: this.userId(req) } as Parameters<
        PerformanceAnalysisService['createClip']
      >[1],
      await this.allowed(req),
    );
  }

  @Patch('sessions/:sessionId/live-clock')
  async updateLiveClock(
    @Req() req: AuthedRequest,
    @Param('sessionId') sessionId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.updateLiveClock(
      sessionId,
      body as Parameters<PerformanceAnalysisService['updateLiveClock']>[1],
      await this.allowed(req),
    );
  }

  @Patch('sessions/:sessionId/status')
  async transitionStatus(
    @Req() req: AuthedRequest,
    @Param('sessionId') sessionId: string,
    @Body() body: { status: string },
  ) {
    return this.service.transitionSessionStatus(
      sessionId,
      body.status,
      await this.allowed(req),
    );
  }

  @Patch('sessions/:sessionId/notes')
  async sessionNotes(
    @Req() req: AuthedRequest,
    @Param('sessionId') sessionId: string,
    @Body() body: { collectiveNotes?: string | null },
  ) {
    return this.service.updateSessionNotes(
      sessionId,
      body.collectiveNotes ?? null,
      await this.allowed(req),
    );
  }

  @Get('sessions/:sessionId/roster')
  async roster(@Req() req: AuthedRequest, @Param('sessionId') sessionId: string) {
    return this.service.getSessionRoster(sessionId, await this.allowed(req));
  }

  @Post('sessions/:sessionId/events/undo')
  async undoEvent(@Req() req: AuthedRequest, @Param('sessionId') sessionId: string) {
    return this.service.undoLastEvent(sessionId, await this.allowed(req));
  }

  @Get('sessions/:sessionId/collective')
  async collective(@Req() req: AuthedRequest, @Param('sessionId') sessionId: string) {
    return this.service.getCollectiveAnalysis(sessionId, await this.allowed(req));
  }

  @Get('sessions/:sessionId/individual/:playerId')
  async individual(
    @Req() req: AuthedRequest,
    @Param('sessionId') sessionId: string,
    @Param('playerId') playerId: string,
  ) {
    return this.service.getIndividualAnalysis(sessionId, playerId, await this.allowed(req));
  }

  @Get('sessions/:sessionId/players/:playerId/material')
  async listMaterial(
    @Req() req: AuthedRequest,
    @Param('sessionId') sessionId: string,
    @Param('playerId') playerId: string,
  ) {
    return this.service.listPlayerMaterial(sessionId, playerId, await this.allowed(req));
  }

  @Post('sessions/:sessionId/players/:playerId/material')
  async addMaterial(
    @Req() req: AuthedRequest,
    @Param('sessionId') sessionId: string,
    @Param('playerId') playerId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.addPlayerMaterial(
      sessionId,
      { ...(body as object), playerId, authorUserId: this.userId(req) } as Parameters<
        PerformanceAnalysisService['addPlayerMaterial']
      >[1],
      await this.allowed(req),
    );
  }

  @Delete('player-material/:itemId')
  async removeMaterial(@Req() req: AuthedRequest, @Param('itemId') itemId: string) {
    return this.service.removePlayerMaterial(itemId, await this.allowed(req));
  }

  @Patch('clips/:clipId')
  async patchClip(
    @Req() req: AuthedRequest,
    @Param('clipId') clipId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.updateClip(
      clipId,
      body as Parameters<PerformanceAnalysisService['updateClip']>[1],
      await this.allowed(req),
    );
  }

  @Get('training-sessions')
  async listTrainingSessions(
    @Req() req: AuthedRequest,
    @Query('tenantId') tenantId: string,
    @Query('category') category?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório.');
    return this.workflows.listTrainingForAnalysis(tenantId.trim(), await this.allowed(req), {
      category,
      from,
      to,
    });
  }

  @Post('training-sessions/:trainingSessionId/open-analysis')
  async openTrainingAnalysis(
    @Req() req: AuthedRequest,
    @Param('trainingSessionId') trainingSessionId: string,
  ) {
    return this.workflows.openTrainingAnalysis(
      trainingSessionId,
      await this.allowed(req),
      this.userId(req),
    );
  }

  @Get('opponent-profiles')
  async listOpponentProfiles(
    @Req() req: AuthedRequest,
    @Query('tenantId') tenantId: string,
    @Query('opponent') opponent?: string,
    @Query('category') category?: string,
    @Query('season') seasonRaw?: string,
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório.');
    const season = seasonRaw?.trim() ? Number(seasonRaw) : undefined;
    return this.workflows.listOpponentProfiles(tenantId.trim(), await this.allowed(req), {
      opponent,
      category,
      season: Number.isFinite(season) ? season : undefined,
    });
  }

  @Post('opponent-profiles')
  async createOpponentProfile(
    @Req() req: AuthedRequest,
    @Body()
    body: {
      tenantId: string;
      opponentName: string;
      visitingTeamId?: string;
      category?: string;
      season?: number;
    },
  ) {
    return this.workflows.createOpponentProfile(body, await this.allowed(req));
  }

  @Get('opponent-profiles/:profileId')
  async getOpponentProfile(@Req() req: AuthedRequest, @Param('profileId') profileId: string) {
    return this.workflows.getOpponentProfileBundle(profileId, await this.allowed(req));
  }

  @Patch('opponent-profiles/:profileId')
  async patchOpponentProfile(
    @Req() req: AuthedRequest,
    @Param('profileId') profileId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.workflows.updateOpponentProfile(profileId, body, await this.allowed(req));
  }

  @Post('opponent-profiles/:profileId/open-analysis')
  async openOpponentAnalysis(
    @Req() req: AuthedRequest,
    @Param('profileId') profileId: string,
  ) {
    return this.workflows.openOpponentAnalysisSession(
      profileId,
      await this.allowed(req),
      this.userId(req),
    );
  }

  @Post('opponent-profiles/:profileId/observed-matches')
  async addObservedMatch(
    @Req() req: AuthedRequest,
    @Param('profileId') profileId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.workflows.addObservedMatch(
      profileId,
      body as Parameters<PerformanceAnalysisWorkflowsService['addObservedMatch']>[1],
      await this.allowed(req),
    );
  }

  @Post('observed-matches/:observedMatchId/link-video')
  async linkObservedVideo(
    @Req() req: AuthedRequest,
    @Param('observedMatchId') observedMatchId: string,
    @Body() body: { videoSourceId: string },
  ) {
    return this.workflows.linkObservedMatchVideo(
      observedMatchId,
      body.videoSourceId,
      await this.allowed(req),
    );
  }

  @Post('opponent-profiles/:profileId/players')
  async upsertOpponentPlayer(
    @Req() req: AuthedRequest,
    @Param('profileId') profileId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.workflows.upsertOpponentPlayer(
      profileId,
      body as Parameters<PerformanceAnalysisWorkflowsService['upsertOpponentPlayer']>[1],
      await this.allowed(req),
    );
  }

  @Post('opponent-profiles/:profileId/lineup')
  async saveLineup(
    @Req() req: AuthedRequest,
    @Param('profileId') profileId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.workflows.saveProbableLineup(
      profileId,
      body as Parameters<PerformanceAnalysisWorkflowsService['saveProbableLineup']>[1],
      await this.allowed(req),
    );
  }

  @Post('opponent-profiles/:profileId/set-pieces')
  async upsertSetPiece(
    @Req() req: AuthedRequest,
    @Param('profileId') profileId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.workflows.upsertSetPiece(
      profileId,
      body as Parameters<PerformanceAnalysisWorkflowsService['upsertSetPiece']>[1],
      await this.allowed(req),
    );
  }

  @Post('opponent-profiles/:profileId/curate-clip')
  async curateClip(
    @Req() req: AuthedRequest,
    @Param('profileId') profileId: string,
    @Body() body: { clipId: string; groupKey: string; sortOrder?: number },
  ) {
    return this.workflows.curateClip(profileId, body, await this.allowed(req));
  }

  @Delete('clip-collection-items/:itemId')
  async removeCuratedClip(@Req() req: AuthedRequest, @Param('itemId') itemId: string) {
    return this.workflows.removeCuratedClip(itemId, await this.allowed(req));
  }

  @Get('pre-match')
  async listPreMatch(
    @Req() req: AuthedRequest,
    @Query('tenantId') tenantId: string,
    @Query('opponent') opponent?: string,
    @Query('category') category?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório.');
    return this.workflows.listPreMatchPreparations(tenantId.trim(), await this.allowed(req), {
      opponent,
      category,
      from,
      to,
    });
  }

  @Post('pre-match/from-travel/:travelLogisticsId')
  async createPreMatchFromTravel(
    @Req() req: AuthedRequest,
    @Param('travelLogisticsId') travelLogisticsId: string,
  ) {
    return this.workflows.createPreMatchFromTravel(
      travelLogisticsId,
      await this.allowed(req),
      this.userId(req),
    );
  }

  @Get('pre-match/:preparationId')
  async getPreMatch(@Req() req: AuthedRequest, @Param('preparationId') preparationId: string) {
    return this.workflows.getPreMatchBundle(preparationId, await this.allowed(req));
  }

  @Post('pre-match/:preparationId/versions')
  async newPreMatchVersion(
    @Req() req: AuthedRequest,
    @Param('preparationId') preparationId: string,
  ) {
    return this.workflows.createPreMatchVersionDraft(
      preparationId,
      await this.allowed(req),
      this.userId(req),
    );
  }

  @Patch('pre-match/versions/:versionId')
  async patchPreMatchVersion(
    @Req() req: AuthedRequest,
    @Param('versionId') versionId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.workflows.updatePreMatchVersion(versionId, body, await this.allowed(req));
  }

  @Post('pre-match/versions/:versionId/lifecycle')
  async transitionPreMatch(
    @Req() req: AuthedRequest,
    @Param('versionId') versionId: string,
    @Body() body: { lifecycle: string },
  ) {
    return this.workflows.transitionPreMatchVersion(
      versionId,
      body.lifecycle,
      await this.allowed(req),
      this.userId(req),
    );
  }

  @Get('pre-match/versions/:versionId/export-html')
  @Header('Cache-Control', 'private, no-store')
  async exportPreMatchHtml(@Req() req: AuthedRequest, @Param('versionId') versionId: string) {
    const html = await this.workflows.exportPreMatchHtml(versionId, await this.allowed(req));
    return { html };
  }

  @Post('sessions/:sessionId/link-pre-match')
  async linkPreMatchToSession(
    @Req() req: AuthedRequest,
    @Param('sessionId') sessionId: string,
    @Body() body: { preMatchVersionId: string },
  ) {
    return this.workflows.linkMatchSessionToPreMatch(
      sessionId,
      body.preMatchVersionId,
      await this.allowed(req),
    );
  }

  @Get('players/:playerId/summary')
  async playerSummary(
    @Req() req: AuthedRequest,
    @Param('playerId') playerId: string,
    @Query('tenantId') tenantId: string,
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório.');
    return this.service.getPlayerAnalysisSummary(
      playerId,
      tenantId.trim(),
      await this.allowed(req),
    );
  }
}
