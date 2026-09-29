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
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import {
  TreinadorGoleirosService,
  UpsertGkSessionInput,
} from './treinador-goleiros.service';

type AuthedRequest = Request & { user: CognitoJwtPayload };

@Controller('treinador-goleiros')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('futebol_treinador_goleiros')
export class TreinadorGoleirosController {
  constructor(private readonly service: TreinadorGoleirosService) {}

  @Get('context')
  getContext(@Query('tenantId') tenantId: string, @Query('category') category?: string) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório');
    return this.service.getContext(tenantId.trim(), category?.trim() || undefined);
  }

  @Get('agenda-treinos')
  agendaTreinos(
    @Query('tenantId') tenantId: string,
    @Query('sessionDate') sessionDate: string,
    @Query('category') category?: string,
  ) {
    if (!tenantId?.trim() || !sessionDate?.trim()) return [];
    return this.service.listAgendaTreinos(tenantId.trim(), sessionDate.trim(), category?.trim());
  }

  @Get('match-reports')
  matchReports(@Query('tenantId') tenantId: string, @Query('category') category?: string) {
    if (!tenantId?.trim()) return [];
    return this.service.listMatchReportsForGk(tenantId.trim(), category?.trim());
  }

  @Get('goalkeepers/search')
  searchGoalkeepers(@Query('tenantId') tenantId: string, @Query('q') q?: string) {
    if (!tenantId?.trim()) return [];
    return this.service.searchGoalkeepers(tenantId.trim(), q?.trim());
  }

  @Get('kpis')
  getKpis(
    @Query('tenantId') tenantId: string,
    @Query('category') category?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório');
    return this.service.getKpis(tenantId.trim(), category?.trim(), from?.trim(), to?.trim());
  }

  @Get('training-sessions')
  listSessions(@Query('tenantId') tenantId: string, @Query('category') category?: string) {
    if (!tenantId?.trim()) return [];
    return this.service.listTrainingSessions(tenantId.trim(), category?.trim() || undefined);
  }

  @Get('training-sessions/:id')
  getSession(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório');
    return this.service.getTrainingSession(id, tenantId.trim());
  }

  @Post('training-sessions')
  upsertSession(@Req() req: AuthedRequest, @Body() body: Record<string, unknown>) {
    const input = this.parseSessionBody(body, req.user.sub);
    return this.service.upsertTrainingSession(input);
  }

  @Patch('training-sessions/:id/player-entries')
  patchPlayerEntries(
    @Param('id') id: string,
    @Body() body: { tenantId?: string; notes?: string; playerEntries?: UpsertGkSessionInput['playerEntries'] },
  ) {
    const tenantId = body?.tenantId?.trim();
    if (!tenantId) throw new BadRequestException('tenantId é obrigatório');
    if (!Array.isArray(body.playerEntries)) {
      throw new BadRequestException('playerEntries é obrigatório');
    }
    return this.service.updateSessionPlayerEntries(
      id,
      tenantId,
      body.playerEntries,
      body.notes,
    );
  }

  @Delete('training-sessions/:id')
  deleteSession(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório');
    return this.service.deleteTrainingSession(id, tenantId.trim());
  }

  @Get('training-sessions/:id/report')
  sessionReport(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório');
    return this.service.getSessionReport(id, tenantId.trim());
  }

  @Get('reports/period')
  periodReport(
    @Query('tenantId') tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('category') category?: string,
  ) {
    if (!tenantId?.trim() || !from?.trim() || !to?.trim()) {
      throw new BadRequestException('tenantId, from e to são obrigatórios');
    }
    return this.service.getPeriodReport(tenantId.trim(), from.trim(), to.trim(), category?.trim());
  }

  @Get('comissao/training-sessions')
  listComissao(@Query('tenantId') tenantId: string, @Query('category') category?: string) {
    if (!tenantId?.trim()) return [];
    return this.service.listComissaoSessions(tenantId.trim(), category?.trim() || undefined);
  }

  @Get('comissao/training-sessions/:id')
  getComissao(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório');
    return this.service.getComissaoSession(id, tenantId.trim());
  }

  @Get('match-analyses')
  listAnalyses(@Query('tenantId') tenantId: string, @Query('category') category?: string) {
    if (!tenantId?.trim()) return [];
    return this.service.listMatchAnalyses(tenantId.trim(), category?.trim() || undefined);
  }

  @Get('match-analyses/:id')
  getAnalysis(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório');
    return this.service.getMatchAnalysis(id, tenantId.trim());
  }

  @Post('match-analyses')
  upsertAnalysis(@Req() req: AuthedRequest, @Body() body: Record<string, unknown>) {
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : '';
    if (!tenantId) throw new BadRequestException('tenantId é obrigatório');
    return this.service.upsertMatchAnalysis({
      id: typeof body.id === 'string' ? body.id : undefined,
      tenantId,
      category: typeof body.category === 'string' ? body.category : null,
      staffId: typeof body.staffId === 'string' ? body.staffId : null,
      authorUserId: req.user.sub,
      coachMatchReportId: typeof body.coachMatchReportId === 'string' ? body.coachMatchReportId : null,
      travelLogisticsId: typeof body.travelLogisticsId === 'string' ? body.travelLogisticsId : null,
      fmfMatchReportId: typeof body.fmfMatchReportId === 'string' ? body.fmfMatchReportId : null,
      observations: typeof body.observations === 'string' ? body.observations : null,
      highlightsVideoUrl: typeof body.highlightsVideoUrl === 'string' ? body.highlightsVideoUrl : null,
      status: typeof body.status === 'string' ? body.status : undefined,
      playerIds: Array.isArray(body.playerIds) ? (body.playerIds as string[]) : [],
      attachments: Array.isArray(body.attachments)
        ? (body.attachments as Array<{ label?: string; fileUrl: string; kind?: string }>)
        : [],
    });
  }

  @Delete('match-analyses/:id')
  deleteAnalysis(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório');
    return this.service.deleteMatchAnalysis(id, tenantId.trim());
  }

  @Get('history/goalkeeper/:playerId')
  gkHistory(@Param('playerId') playerId: string, @Query('tenantId') tenantId: string) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório');
    return this.service.getGoalkeeperConsolidatedHistory(playerId, tenantId.trim());
  }

  @Post('distribute')
  distribute(@Req() req: AuthedRequest, @Body() body: Record<string, unknown>) {
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : '';
    const kind = typeof body.kind === 'string' ? body.kind.trim() : '';
    const referenceId = typeof body.referenceId === 'string' ? body.referenceId.trim() : '';
    const summary = typeof body.summary === 'string' ? body.summary.trim() : '';
    if (!tenantId || !kind || !referenceId || !summary) {
      throw new BadRequestException('tenantId, kind, referenceId e summary são obrigatórios');
    }
    return this.service.distributeReport({
      tenantId,
      kind,
      referenceId,
      sentByUserId: req.user.sub,
      summary,
    });
  }

  private parseSessionBody(body: Record<string, unknown>, authorUserId: string): UpsertGkSessionInput {
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : '';
    const sessionDate = typeof body.sessionDate === 'string' ? body.sessionDate.trim() : '';
    if (!tenantId || !sessionDate) {
      throw new BadRequestException('tenantId e sessionDate são obrigatórios');
    }
    return {
      id: typeof body.id === 'string' ? body.id : undefined,
      tenantId,
      category: typeof body.category === 'string' ? body.category : null,
      staffId: typeof body.staffId === 'string' ? body.staffId : null,
      authorUserId,
      sessionDate,
      startTime: typeof body.startTime === 'string' ? body.startTime : null,
      endTime: typeof body.endTime === 'string' ? body.endTime : null,
      characteristics: typeof body.characteristics === 'string' ? body.characteristics : null,
      objectives: typeof body.objectives === 'string' ? body.objectives : null,
      physicalQualities: typeof body.physicalQualities === 'string' ? body.physicalQualities : null,
      notes: typeof body.notes === 'string' ? body.notes : null,
      status: typeof body.status === 'string' ? body.status : undefined,
      agendaEntryId: typeof body.agendaEntryId === 'string' ? body.agendaEntryId : null,
      planTemplateId: typeof body.planTemplateId === 'string' ? body.planTemplateId : null,
      activities: Array.isArray(body.activities) ? (body.activities as UpsertGkSessionInput['activities']) : undefined,
      playerEntries: Array.isArray(body.playerEntries)
        ? (body.playerEntries as UpsertGkSessionInput['playerEntries'])
        : undefined,
      attachments: Array.isArray(body.attachments)
        ? (body.attachments as UpsertGkSessionInput['attachments'])
        : undefined,
    };
  }
}
