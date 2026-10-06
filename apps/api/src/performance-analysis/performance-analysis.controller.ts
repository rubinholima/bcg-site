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

type AuthedRequest = Request & { user: CognitoJwtPayload };

@Controller('performance-analysis')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('futebol_analise_desempenho')
export class PerformanceAnalysisController {
  constructor(
    private readonly service: PerformanceAnalysisService,
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
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório.');
    const limit = limitRaw?.trim() ? Number(limitRaw) : 40;
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
