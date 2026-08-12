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
import { RequireModule } from '../auth/require-module.decorator';
import { FutebolTreinadoresService } from './futebol-treinadores.service';

type AuthedRequest = Request & { user: CognitoJwtPayload };

@Controller('futebol-treinadores')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('futebol_treinadores')
export class FutebolTreinadoresController {
  constructor(private readonly service: FutebolTreinadoresService) {}

  @Get('context')
  getContext(
    @Query('tenantId') tenantId: string,
    @Query('category') category?: string,
  ) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId é obrigatório');
    }
    return this.service.getContext(tenantId.trim(), category?.trim() || undefined);
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
      category: typeof body.category === 'string' ? body.category : null,
      staffId: typeof body.staffId === 'string' ? body.staffId : null,
      authorUserId: req.user?.sub,
      matchDate: typeof body.matchDate === 'string' ? body.matchDate : null,
      opponentName: typeof body.opponentName === 'string' ? body.opponentName : null,
      teamReport: typeof body.teamReport === 'string' ? body.teamReport : null,
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
    });
  }

  @Delete('training-sessions/:id')
  deleteTrainingSession(@Param('id') id: string) {
    return this.service.deleteTrainingSession(id);
  }
}
