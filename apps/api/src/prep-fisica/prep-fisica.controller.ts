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
import { PrepFisicaService, UpsertPrepSessionInput } from './prep-fisica.service';
import { PrepPseService } from './prep-pse.service';
import { PrepLoadSyncService } from './prep-load-sync.service';

type AuthedRequest = Request & { user: CognitoJwtPayload };

@Controller('prep-fisica')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('futebol_preparacao_fisica')
export class PrepFisicaController {
  constructor(
    private readonly service: PrepFisicaService,
    private readonly pse: PrepPseService,
    private readonly loadSync: PrepLoadSyncService,
  ) {}

  @Get('context')
  getContext(@Query('tenantId') tenantId: string, @Query('category') category?: string) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório');
    return this.service.getContext(tenantId.trim(), category?.trim() || undefined);
  }

  @Get('agenda-treinos')
  listAgendaTreinos(
    @Query('tenantId') tenantId: string,
    @Query('sessionDate') sessionDate: string,
    @Query('category') category?: string,
  ) {
    if (!tenantId?.trim() || !sessionDate?.trim()) return [];
    return this.service.listAgendaTreinos(tenantId.trim(), sessionDate.trim(), category?.trim());
  }

  @Get('training-sessions')
  listTrainingSessions(
    @Query('tenantId') tenantId: string,
    @Query('category') category?: string,
    @Query('sessionDate') sessionDate?: string,
  ) {
    if (!tenantId?.trim()) return [];
    return this.service.listTrainingSessions(
      tenantId.trim(),
      category?.trim() || undefined,
      sessionDate?.trim() || undefined,
    );
  }

  @Get('training-sessions/:id')
  getTrainingSession(@Param('id') id: string) {
    return this.service.getTrainingSession(id);
  }

  @Post('training-sessions')
  upsertTrainingSession(@Req() req: AuthedRequest, @Body() body: Record<string, unknown>) {
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : '';
    if (!tenantId) throw new BadRequestException('tenantId é obrigatório');
    const sessionDate = typeof body.sessionDate === 'string' ? body.sessionDate : '';
    if (!sessionDate) throw new BadRequestException('sessionDate é obrigatório');

    const input: UpsertPrepSessionInput = {
      id: typeof body.id === 'string' ? body.id : undefined,
      tenantId,
      category: typeof body.category === 'string' ? body.category : null,
      staffId: typeof body.staffId === 'string' ? body.staffId : null,
      authorUserId: req.user?.sub,
      sessionDate,
      startTime: typeof body.startTime === 'string' ? body.startTime : null,
      endTime: typeof body.endTime === 'string' ? body.endTime : null,
      location: typeof body.location === 'string' ? body.location : null,
      objectives: typeof body.objectives === 'string' ? body.objectives : null,
      notes: typeof body.notes === 'string' ? body.notes : null,
      status: typeof body.status === 'string' ? body.status : undefined,
      agendaEntryId: typeof body.agendaEntryId === 'string' ? body.agendaEntryId : null,
      planTemplateId: typeof body.planTemplateId === 'string' ? body.planTemplateId : null,
      blockGroupId: typeof body.blockGroupId === 'string' ? body.blockGroupId : null,
      blockSequence:
        typeof body.blockSequence === 'number'
          ? body.blockSequence
          : typeof body.blockSequence === 'string' && body.blockSequence.trim()
            ? Number(body.blockSequence)
            : undefined,
      activities: Array.isArray(body.activities) ? (body.activities as UpsertPrepSessionInput['activities']) : undefined,
      playerEntries: Array.isArray(body.playerEntries)
        ? (body.playerEntries as UpsertPrepSessionInput['playerEntries'])
        : undefined,
      attachments: Array.isArray(body.attachments)
        ? (body.attachments as UpsertPrepSessionInput['attachments'])
        : undefined,
    };
    return this.service.upsertTrainingSession(input);
  }

  @Patch('training-sessions/:id/player-entries')
  patchPlayerEntries(
    @Param('id') id: string,
    @Body() body: { tenantId?: string; playerEntries?: UpsertPrepSessionInput['playerEntries'] },
  ) {
    const tenantId = body?.tenantId?.trim();
    if (!tenantId) throw new BadRequestException('tenantId é obrigatório');
    if (!Array.isArray(body.playerEntries)) {
      throw new BadRequestException('playerEntries é obrigatório');
    }
    return this.service.updateSessionPlayerEntries(id, tenantId, body.playerEntries);
  }

  @Delete('training-sessions/:id')
  deleteTrainingSession(@Param('id') id: string) {
    return this.service.deleteTrainingSession(id);
  }

  @Get('training-plan-templates')
  listPlanTemplates(@Query('tenantId') tenantId: string, @Query('category') category?: string) {
    if (!tenantId?.trim()) return [];
    return this.service.listPlanTemplates(tenantId.trim(), category?.trim() || undefined);
  }

  @Delete('training-plan-templates/:id')
  deletePlanTemplate(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório');
    return this.service.deletePlanTemplate(id, tenantId.trim());
  }

  @Post('training-plan-templates')
  upsertPlanTemplate(@Req() req: AuthedRequest, @Body() body: Record<string, unknown>) {
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const fileUrl = typeof body.fileUrl === 'string' ? body.fileUrl.trim() : '';
    if (!tenantId || !title || !fileUrl) {
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

  @Get('objectives')
  listObjectives(@Query('tenantId') tenantId: string) {
    if (!tenantId?.trim()) return [];
    return this.service.listObjectives(tenantId.trim());
  }

  @Post('objectives')
  createObjective(@Body() body: Record<string, unknown>) {
    const tenantId = typeof body.tenantId === 'string' ? body.tenantId.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!tenantId || !title) throw new BadRequestException('tenantId e title são obrigatórios');
    return this.service.createObjective(
      tenantId,
      title,
      typeof body.description === 'string' ? body.description : null,
    );
  }

  @Get('kpis')
  getKpis(
    @Query('tenantId') tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('category') category?: string,
  ) {
    if (!tenantId?.trim() || !from?.trim() || !to?.trim()) {
      throw new BadRequestException('tenantId, from e to são obrigatórios');
    }
    return this.service.getKpis(tenantId.trim(), category?.trim(), from.trim(), to.trim());
  }

  @Get('performance-overview')
  getPerformanceOverview(
    @Query('tenantId') tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('category') category?: string,
    @Query('playerId') playerId?: string,
  ) {
    if (!tenantId?.trim() || !from?.trim() || !to?.trim()) {
      throw new BadRequestException('tenantId, from e to são obrigatórios');
    }
    return this.service.getPerformanceOverview(
      tenantId.trim(),
      category?.trim(),
      from.trim(),
      to.trim(),
      playerId?.trim(),
    );
  }

  @Get('training-sessions/:id/pse-status')
  listPseStatus(@Param('id') id: string) {
    return this.pse.listPseStatus(id);
  }

  @Post('training-sessions/:id/pse-link')
  createPseLink(@Param('id') sessionId: string, @Body() body: { playerId?: string }) {
    const playerId = body?.playerId?.trim();
    if (!playerId) throw new BadRequestException('playerId é obrigatório');
    return this.pse.createTokenLink(sessionId, playerId);
  }

  @Post('pse/import-csv')
  importPseCsv(@Body() body: { tenantId?: string; rows?: Array<{ email: string; sessionDate: string; category: string; rpe: number }> }) {
    const tenantId = body?.tenantId?.trim();
    if (!tenantId || !Array.isArray(body.rows)) {
      throw new BadRequestException('tenantId e rows são obrigatórios');
    }
    return this.pse.importCsv(tenantId, body.rows);
  }

  @Post('load-sync/day')
  syncLoadDay(
    @Body() body: { tenantId?: string; category?: string; sessionDate?: string },
  ) {
    const tenantId = body?.tenantId?.trim();
    const category = body?.category?.trim();
    const sessionDate = body?.sessionDate?.trim();
    if (!tenantId || !category || !sessionDate) {
      throw new BadRequestException('tenantId, category e sessionDate são obrigatórios');
    }
    return this.loadSync.syncForTrainingDay(tenantId, category, sessionDate);
  }
}
