import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule, TeamReportReadAccess } from '../auth/require-module.decorator';
import { FutebolTreinadoresService } from './futebol-treinadores.service';

type AuthedRequest = Request & { user: CognitoJwtPayload };

@Controller('futebol-treinadores')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('futebol_treinadores')
export class FutebolTreinadoresController {
  constructor(private readonly service: FutebolTreinadoresService) {}

  @Get('context')
  @TeamReportReadAccess()
  getContext(
    @Query('tenantId') tenantId: string,
    @Query('category') category?: string,
  ) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId é obrigatório');
    }
    return this.service.getContext(tenantId.trim(), category?.trim() || undefined);
  }

  @Post('match-stats')
  upsertMatchStats(@Body() body: Record<string, unknown>) {
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : '';
    const matchDate = typeof body.matchDate === 'string' ? body.matchDate.trim() : '';
    if (!tenantId || !matchDate) {
      throw new BadRequestException('tenantId e matchDate são obrigatórios');
    }
    const num = (key: string) =>
      typeof body[key] === 'number' ? (body[key] as number) : null;
    return this.service.upsertMatchStatOverride({
      tenantId,
      category: typeof body.category === 'string' ? body.category : null,
      fmfMatchReportId: typeof body.fmfMatchReportId === 'string' ? body.fmfMatchReportId : null,
      travelLogisticsId:
        typeof body.travelLogisticsId === 'string' ? body.travelLogisticsId : null,
      matchDate,
      opponentName: typeof body.opponentName === 'string' ? body.opponentName : null,
      goalsFor: num('goalsFor'),
      goalsAgainst: num('goalsAgainst'),
      yellowCards: num('yellowCards'),
      redCards: num('redCards'),
      possessionPct: num('possessionPct'),
      setPiecesFor: num('setPiecesFor'),
      setPiecesAgainst: num('setPiecesAgainst'),
      notes: typeof body.notes === 'string' ? body.notes : null,
    });
  }

  @Get('match-reports')
  listMatchReports(
    @Query('tenantId') tenantId: string,
    @Query('category') category?: string,
  ) {
    if (!tenantId?.trim()) return [];
    return this.service.listMatchReports(tenantId.trim(), category?.trim() || undefined);
  }

  @Get('match-reports/:id')
  getMatchReport(@Param('id') id: string) {
    return this.service.getMatchReport(id);
  }

  @Post('match-reports')
  upsertMatchReport(@Req() req: AuthedRequest, @Body() body: Record<string, unknown>) {
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : '';
    if (!tenantId) throw new BadRequestException('tenantId é obrigatório');
    return this.service.upsertMatchReport({
      id: typeof body.id === 'string' ? body.id : undefined,
      tenantId,
      travelLogisticsId:
        typeof body.travelLogisticsId === 'string' ? body.travelLogisticsId : null,
      fmfMatchReportId: typeof body.fmfMatchReportId === 'string' ? body.fmfMatchReportId : null,
      category: typeof body.category === 'string' ? body.category : null,
      staffId: typeof body.staffId === 'string' ? body.staffId : null,
      authorUserId: req.user?.sub,
      matchDate: typeof body.matchDate === 'string' ? body.matchDate : null,
      opponentName: typeof body.opponentName === 'string' ? body.opponentName : null,
      teamReport: typeof body.teamReport === 'string' ? body.teamReport : null,
      matchSummary: typeof body.matchSummary === 'string' ? body.matchSummary : null,
      aspectsToImprove: typeof body.aspectsToImprove === 'string' ? body.aspectsToImprove : null,
      goodActions: typeof body.goodActions === 'string' ? body.goodActions : null,
      opponentBestJersey:
        typeof body.opponentBestJersey === 'number'
          ? body.opponentBestJersey
          : typeof body.opponentBestJersey === 'string' && body.opponentBestJersey.trim()
            ? Number(body.opponentBestJersey)
            : null,
      opponentBestPosition:
        typeof body.opponentBestPosition === 'string' ? body.opponentBestPosition : null,
      opponentBestNotes: typeof body.opponentBestNotes === 'string' ? body.opponentBestNotes : null,
      opponentBestPlayers: Array.isArray(body.opponentBestPlayers)
        ? (body.opponentBestPlayers as Array<Record<string, unknown>>).map((row) => ({
            jerseyNumber:
              typeof row.jerseyNumber === 'number'
                ? row.jerseyNumber
                : typeof row.jerseyNumber === 'string' && row.jerseyNumber.trim()
                  ? Number(row.jerseyNumber)
                  : null,
            position: typeof row.position === 'string' ? row.position : null,
            notes: typeof row.notes === 'string' ? row.notes : null,
          }))
        : undefined,
      generalNotes: typeof body.generalNotes === 'string' ? body.generalNotes : null,
      status: typeof body.status === 'string' ? body.status : undefined,
      playerRatings: Array.isArray(body.playerRatings)
        ? (body.playerRatings as Array<{
            playerId: string;
            rating?: number | null;
            individualReport?: string | null;
          }>)
        : undefined,
      attachments: Array.isArray(body.attachments)
        ? (body.attachments as Array<{
            id?: string;
            label?: string | null;
            fileUrl: string;
            kind?: string | null;
          }>)
        : undefined,
    });
  }

  @Delete('match-reports/:id')
  deleteMatchReport(@Param('id') id: string) {
    return this.service.deleteMatchReport(id);
  }

  @Get('training-sessions')
  listTrainingSessions(
    @Query('tenantId') tenantId: string,
    @Query('category') category?: string,
  ) {
    if (!tenantId?.trim()) return [];
    return this.service.listTrainingSessions(tenantId.trim(), category?.trim() || undefined);
  }

  @Get('training-sessions/:id')
  getTrainingSession(@Param('id') id: string) {
    return this.service.getTrainingSession(id);
  }

  @Post('training-sessions')
  upsertTrainingSession(@Req() req: AuthedRequest, @Body() body: Record<string, unknown>) {
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : '';
    const sessionDate = typeof body.sessionDate === 'string' ? body.sessionDate.trim() : '';
    if (!tenantId || !sessionDate) {
      throw new BadRequestException('tenantId e sessionDate são obrigatórios');
    }
    return this.service.upsertTrainingSession({
      id: typeof body.id === 'string' ? body.id : undefined,
      tenantId,
      category: typeof body.category === 'string' ? body.category : null,
      staffId: typeof body.staffId === 'string' ? body.staffId : null,
      authorUserId: req.user?.sub,
      sessionDate,
      startTime: typeof body.startTime === 'string' ? body.startTime : null,
      endTime: typeof body.endTime === 'string' ? body.endTime : null,
      objectives: typeof body.objectives === 'string' ? body.objectives : null,
      notes: typeof body.notes === 'string' ? body.notes : null,
      status: typeof body.status === 'string' ? body.status : undefined,
      activities: Array.isArray(body.activities)
        ? (body.activities as Array<{
            id?: string;
            kind: string;
            title: string;
            description?: string | null;
            durationMinutes?: number | null;
            sortOrder?: number;
            mediaUrl?: string | null;
          }>)
        : undefined,
      playerEntries: Array.isArray(body.playerEntries)
        ? (body.playerEntries as Array<{
            playerId: string;
            available?: boolean;
            unavailableReason?: string | null;
            rating?: number | null;
            notes?: string | null;
          }>)
        : undefined,
      agendaEntryId: typeof body.agendaEntryId === 'string' ? body.agendaEntryId : null,
      planTemplateId: typeof body.planTemplateId === 'string' ? body.planTemplateId : null,
      attachments: Array.isArray(body.attachments)
        ? (body.attachments as Array<{
            id?: string;
            label?: string | null;
            fileUrl: string;
            kind?: string | null;
          }>)
        : undefined,
    });
  }

  @Delete('training-sessions/:id')
  deleteTrainingSession(@Param('id') id: string) {
    return this.service.deleteTrainingSession(id);
  }

  @Get('training-plan-templates')
  listPlanTemplates(
    @Query('tenantId') tenantId: string,
    @Query('category') category?: string,
  ) {
    if (!tenantId?.trim()) return [];
    return this.service.listPlanTemplates(tenantId.trim(), category?.trim() || undefined);
  }

  @Post('training-plan-templates')
  upsertPlanTemplate(@Req() req: AuthedRequest, @Body() body: Record<string, unknown>) {
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : '';
    const title = typeof body.title === 'string' ? body.title : '';
    const fileUrl = typeof body.fileUrl === 'string' ? body.fileUrl : '';
    if (!tenantId || !title.trim() || !fileUrl.trim()) {
      throw new BadRequestException('tenantId, title e fileUrl são obrigatórios');
    }
    return this.service.upsertPlanTemplate({
      id: typeof body.id === 'string' ? body.id : undefined,
      tenantId,
      category: typeof body.category === 'string' ? body.category : null,
      title,
      fileUrl,
      notes: typeof body.notes === 'string' ? body.notes : null,
      authorUserId: req.user?.sub,
    });
  }

  @Delete('training-plan-templates/:id')
  deletePlanTemplate(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório');
    return this.service.deletePlanTemplate(id, tenantId.trim());
  }

  @Get('agenda-treinos')
  listAgendaTreinos(
    @Query('tenantId') tenantId: string,
    @Query('sessionDate') sessionDate: string,
    @Query('category') category?: string,
  ) {
    if (!tenantId?.trim() || !sessionDate?.trim()) return [];
    return this.service.listAgendaTreinosForLink(
      tenantId.trim(),
      sessionDate.trim(),
      category?.trim() || undefined,
    );
  }

  @Get('training-sessions/:id/report')
  getTrainingSessionReport(@Param('id') id: string) {
    return this.service.getTrainingSessionReport(id);
  }

  @Get('training-sessions/report/period')
  getTrainingPeriodReport(
    @Query('tenantId') tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('category') category?: string,
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório');
    return this.service.getTrainingPeriodReport(
      tenantId.trim(),
      from?.trim(),
      to?.trim(),
      category?.trim() || undefined,
    );
  }

  @Get('team-reports/evaluation-draft')
  @TeamReportReadAccess()
  getTeamReportEvaluationDraft(
    @Query('tenantId') tenantId: string,
    @Query('season') seasonRaw: string,
    @Query('periodKey') periodKey: string,
    @Query('category') category?: string,
    @Query('reportId') reportId?: string,
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório');
    const season = Number(seasonRaw);
    if (!Number.isFinite(season) || season < 2000) {
      throw new BadRequestException('season inválida');
    }
    if (!periodKey?.trim()) throw new BadRequestException('periodKey é obrigatório');
    return this.service.getTeamReportEvaluationDraft(
      tenantId.trim(),
      season,
      periodKey.trim(),
      category?.trim() || undefined,
      reportId?.trim() || undefined,
    );
  }

  @Get('team-reports/summary')
  @TeamReportReadAccess()
  getTeamReportSummary(
    @Query('tenantId') tenantId: string,
    @Query('category') category?: string,
  ) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId é obrigatório');
    }
    return this.service.getTeamReportSummary(tenantId.trim(), category?.trim() || undefined);
  }

  @Get('team-reports')
  @TeamReportReadAccess()
  listTeamReports(
    @Query('tenantId') tenantId: string,
    @Query('category') category?: string,
    @Query('periodType') periodType?: string,
    @Query('status') status?: string,
    @Query('season') seasonRaw?: string,
    @Query('periodKey') periodKey?: string,
  ) {
    if (!tenantId?.trim()) return [];
    const season = seasonRaw ? Number(seasonRaw) : undefined;
    return this.service.listTeamReports(
      tenantId.trim(),
      category?.trim() || undefined,
      periodType?.trim() || undefined,
      status?.trim() || undefined,
      season && Number.isFinite(season) ? season : undefined,
      periodKey?.trim() || undefined,
    );
  }

  @Get('team-reports/:id')
  @TeamReportReadAccess()
  getTeamReport(@Param('id') id: string) {
    return this.service.getTeamReport(id);
  }

  @Post('team-reports')
  upsertTeamReport(@Req() req: AuthedRequest, @Body() body: Record<string, unknown>) {
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : '';
    const periodType = typeof body.periodType === 'string' ? body.periodType.trim() : '';
    if (!tenantId || !periodType) {
      throw new BadRequestException('tenantId e periodType são obrigatórios');
    }
    return this.service.upsertTeamReport({
      id: typeof body.id === 'string' ? body.id : undefined,
      tenantId,
      category: typeof body.category === 'string' ? body.category : null,
      periodType,
      season: typeof body.season === 'number' ? body.season : Number(body.season) || null,
      periodKey: typeof body.periodKey === 'string' ? body.periodKey : null,
      periodStart: typeof body.periodStart === 'string' ? body.periodStart : null,
      periodEnd: typeof body.periodEnd === 'string' ? body.periodEnd : null,
      generalDescription:
        typeof body.generalDescription === 'string' ? body.generalDescription : null,
      weakPoints: typeof body.weakPoints === 'string' ? body.weakPoints : null,
      status: typeof body.status === 'string' ? body.status : undefined,
      staffId: typeof body.staffId === 'string' ? body.staffId : null,
      authorUserId: req.user?.sub,
      playerActions: Array.isArray(body.playerActions)
        ? (body.playerActions as Array<{
            playerId: string;
            actionType: string;
            reason?: string | null;
          }>)
        : undefined,
      playerEvaluations: Array.isArray(body.playerEvaluations)
        ? (body.playerEvaluations as Array<{
            playerId: string;
            gamesCount?: number;
            gamesMinutes?: number;
            trainingMinutes?: number;
            avgMatchRating?: number | null;
            coachFinalRating?: number | null;
          }>)
        : undefined,
    });
  }

  @Post('team-reports/:id/submit')
  submitTeamReport(@Param('id') id: string) {
    return this.service.submitTeamReport(id);
  }

  @Delete('team-reports/:id')
  deleteTeamReport(@Param('id') id: string) {
    return this.service.deleteTeamReport(id);
  }
}
