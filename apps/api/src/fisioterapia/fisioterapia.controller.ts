import {
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
import { TenantAccessService } from '../auth/tenant-access.service';
import { FisioterapiaService } from './fisioterapia.service';
import {
  AddPhysioEvolutionDto,
  CreatePhysioDiagnosisDto,
  CreatePhysioGameAttendanceDto,
  CreatePhysioGroupSessionDto,
  CreatePhysioPlayerEvaluationBatchDto,
  CreatePhysioPlayerEvaluationDto,
  CreatePhysioSessionDto,
  CreatePhysioTransitionEntryDto,
  CreatePhysioTreatmentDto,
  SetPhysioDispositionDto,
  UpdatePhysioGameAttendanceDto,
  UpdatePhysioGroupSessionDto,
  UpdatePhysioPlayerEvaluationDto,
  UpdatePhysioSessionDto,
  UpdatePhysioTransitionEntryDto,
} from './dto/fisioterapia.dto';

@Controller('fisioterapia')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class FisioterapiaController {
  constructor(
    private readonly service: FisioterapiaService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private async allowedTenants(req: Request & { user: CognitoJwtPayload }) {
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    return this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
  }

  @Get('regions')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  listRegions() {
    return this.service.listRegions();
  }

  @Get('diagnoses')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  listDiagnoses(@Query('regionId') regionId?: string) {
    return this.service.listDiagnoses(regionId);
  }

  @Post('diagnoses')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  createDiagnosis(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: CreatePhysioDiagnosisDto,
  ) {
    return this.service.createDiagnosis(dto, req.user.sub);
  }

  @Get('treatments')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  listTreatments(@Query('regionId') regionId?: string) {
    return this.service.listTreatments(regionId);
  }

  @Post('treatments')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  createTreatment(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: CreatePhysioTreatmentDto,
  ) {
    return this.service.createTreatment(dto, req.user.sub);
  }

  @Get('sessions')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async listSessions(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('playerId') playerId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.listSessions({ tenantId, playerId, status, from, to }, allowed);
  }

  @Get('sessions/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async getSession(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.findSession(id, allowed);
  }

  @Post('sessions')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async createSession(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: CreatePhysioSessionDto,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.createSession(dto, allowed, req.user.sub);
  }

  @Patch('sessions/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async updateSession(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdatePhysioSessionDto,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.updateSession(id, dto, allowed);
  }

  @Post('sessions/:id/evolution')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async addEvolution(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: AddPhysioEvolutionDto,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.addEvolution(id, dto, allowed, {
      id: req.user.sub,
      name: req.user.name ?? req.user.email,
    });
  }

  @Post('sessions/:id/complete')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async complete(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.completeSession(id, allowed);
  }

  @Post('sessions/:id/disposition')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async setDisposition(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: SetPhysioDispositionDto,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.setDisposition(id, dto.disposition, allowed);
  }

  @Get('sessions/:sessionId/transitions')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async listTransitions(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('sessionId') sessionId: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.listTransitionEntries(sessionId, allowed);
  }

  @Post('sessions/:sessionId/transitions')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async createTransition(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('sessionId') sessionId: string,
    @Body() dto: CreatePhysioTransitionEntryDto,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.createTransitionEntry(sessionId, dto, allowed, req.user.sub);
  }

  @Patch('sessions/:sessionId/transitions/:entryId')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async updateTransition(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('sessionId') sessionId: string,
    @Param('entryId') entryId: string,
    @Body() dto: UpdatePhysioTransitionEntryDto,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.updateTransitionEntry(sessionId, entryId, dto, allowed);
  }

  @Delete('sessions/:sessionId/transitions/:entryId')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async removeTransition(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('sessionId') sessionId: string,
    @Param('entryId') entryId: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.deleteTransitionEntry(sessionId, entryId, allowed);
  }

  @Delete('sessions/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async remove(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.deleteSession(id, allowed);
  }

  @Get('group-sessions/category-roster')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async groupCategoryRoster(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId: string,
    @Query('category') category: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.categoryRoster(tenantId, category, allowed);
  }

  @Get('group-sessions')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async listGroupSessions(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('category') category?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.listGroupSessions({ tenantId, category, from, to }, allowed);
  }

  @Get('group-sessions/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async getGroupSession(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.findGroupSession(id, allowed);
  }

  @Post('group-sessions')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async createGroupSession(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: CreatePhysioGroupSessionDto,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.createGroupSession(dto, allowed, req.user.sub);
  }

  @Patch('group-sessions/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async updateGroupSession(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdatePhysioGroupSessionDto,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.updateGroupSession(id, dto, allowed);
  }

  @Delete('group-sessions/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async removeGroupSession(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.deleteGroupSession(id, allowed);
  }

  @Get('game-attendances')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async listGameAttendances(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('category') category?: string,
    @Query('playerId') playerId?: string,
    @Query('gameDate') gameDate?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.listGameAttendances(
      { tenantId, category, playerId, gameDate, from, to },
      allowed,
    );
  }

  @Get('game-attendances/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async getGameAttendance(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.findGameAttendance(id, allowed);
  }

  @Post('game-attendances')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async createGameAttendance(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: CreatePhysioGameAttendanceDto,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.createGameAttendance(dto, allowed, req.user.sub);
  }

  @Patch('game-attendances/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async updateGameAttendance(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdatePhysioGameAttendanceDto,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.updateGameAttendance(id, dto, allowed);
  }

  @Delete('game-attendances/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async removeGameAttendance(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.deleteGameAttendance(id, allowed);
  }

  @Get('evaluations')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async listPlayerEvaluations(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('category') category?: string,
    @Query('playerId') playerId?: string,
    @Query('context') context?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.listPlayerEvaluations(
      { tenantId, category, playerId, context, from, to },
      allowed,
    );
  }

  @Post('evaluations/batch')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async createPlayerEvaluationBatch(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: CreatePhysioPlayerEvaluationBatchDto,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.createPlayerEvaluationBatch(dto, allowed, req.user.sub);
  }

  @Get('evaluations/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async getPlayerEvaluation(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.findPlayerEvaluation(id, allowed);
  }

  @Post('evaluations')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async createPlayerEvaluation(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: CreatePhysioPlayerEvaluationDto,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.createPlayerEvaluation(dto, allowed, req.user.sub);
  }

  @Patch('evaluations/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async updatePlayerEvaluation(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdatePhysioPlayerEvaluationDto,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.updatePlayerEvaluation(id, dto, allowed);
  }

  @Delete('evaluations/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async removePlayerEvaluation(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.deletePlayerEvaluation(id, allowed);
  }

  @Get('reports/dashboard')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async reportsDashboard(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('category') category?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.getReportsDashboard({ tenantId, category, from, to }, allowed);
  }
}
