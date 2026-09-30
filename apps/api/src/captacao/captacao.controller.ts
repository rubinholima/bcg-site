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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { CaptacaoService } from './captacao.service';
import { TenantAccessService } from '../auth/tenant-access.service';
import { CognitoJwtPayload } from '../auth/jwt-auth.guard';
import type { Request } from 'express';
import { CreateScoutDto } from './dto/create-scout.dto';
import { UpdateScoutDto } from './dto/update-scout.dto';
import { CreateProspectDto } from './dto/create-prospect.dto';
import { UpdateProspectDto } from './dto/update-prospect.dto';
import { CreateReportDto } from './dto/create-report.dto';
import {
  ScoutLocationPingDto,
  ScoutTrackingDto,
} from './dto/scout-location.dto';
import { ApproveProspectDto, PromoteProspectDto } from './dto/approve-prospect.dto';
import { UpdateCtScheduleDto } from './dto/update-ct-schedule.dto';
import { ManagerDecisionDto } from './dto/manager-decision.dto';
import { ProposeCtDto } from './dto/propose-ct.dto';
import { SupervisorCtDto } from './dto/supervisor-ct.dto';

@Controller('captacao')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class CaptacaoController {
  constructor(
    private readonly service: CaptacaoService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  @Get('stats')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  stats(@Query('tenantId') tenantId?: string) {
    return this.service.getStats(tenantId);
  }

  @Get('map')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  mapData(@Query('tenantId') tenantId?: string) {
    return this.service.getMapData(tenantId);
  }

  @Get('scouts')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  findScouts(
    @Query('tenantId') tenantId?: string,
    @Query('active') active?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findScouts(tenantId, active, search);
  }

  @Get('scouts/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  findScout(@Param('id') id: string) {
    return this.service.findScout(id);
  }

  @Post('scouts')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  createScout(@Body() dto: CreateScoutDto) {
    return this.service.createScout(dto);
  }

  @Patch('scouts/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  updateScout(@Param('id') id: string, @Body() dto: UpdateScoutDto) {
    return this.service.updateScout(id, dto);
  }

  @Delete('scouts/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  removeScout(@Param('id') id: string) {
    return this.service.removeScout(id);
  }

  @Post('scouts/:id/location')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  recordLocation(@Param('id') id: string, @Body() dto: ScoutLocationPingDto) {
    return this.service.recordPing(id, dto);
  }

  @Patch('scouts/:id/tracking')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  setTracking(@Param('id') id: string, @Body() dto: ScoutTrackingDto) {
    return this.service.setTracking(id, dto);
  }

  @Get('scouts/:id/locations')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  scoutLocations(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.service.getScoutLocationHistory(
      id,
      limit ? Number(limit) : 50,
    );
  }

  @Get('prospects')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  findProspects(
    @Query('tenantId') tenantId?: string,
    @Query('stage') stage?: string,
    @Query('priority') priority?: string,
    @Query('scoutId') scoutId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findProspects(tenantId, stage, priority, scoutId, search);
  }

  @Get('ct-evaluation-queue')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  findCtEvaluationQueue(@Query('tenantId') tenantId?: string) {
    return this.service.findCtEvaluationQueue(tenantId);
  }

  @Get('players/:playerId/history')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  findPlayerCaptacaoHistory(@Param('playerId') playerId: string) {
    return this.service.findPlayerCaptacaoHistory(playerId);
  }

  @Get('prospects/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  findProspect(@Param('id') id: string) {
    return this.service.findProspect(id);
  }

  @Post('prospects')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  createProspect(@Body() dto: CreateProspectDto) {
    return this.service.createProspect(dto);
  }

  @Patch('prospects/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  updateProspect(@Param('id') id: string, @Body() dto: UpdateProspectDto) {
    return this.service.updateProspect(id, dto);
  }

  @Patch('prospects/:id/ct-schedule')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  updateCtSchedule(@Param('id') id: string, @Body() dto: UpdateCtScheduleDto) {
    return this.service.updateCtSchedule(id, dto);
  }

  @Get('prospects/:id/physio-clearance-status')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_captacao', 'futebol_preparacao_fisica', 'saude'])
  getPhysioClearanceStatus(@Param('id') id: string) {
    return this.service.getPhysioClearanceOperationalStatus(id);
  }

  @Post('prospects/:id/approve')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  approveProspect(
    @Param('id') id: string,
    @Body() dto: ApproveProspectDto,
    @Req() req: { user: { name?: string; email?: string } },
  ) {
    const actorName =
      (req.user.name as string) ||
      (req.user.email as string) ||
      'Supervisor';
    return this.service.approveProspect(id, dto, actorName);
  }

  @Post('prospects/:id/promote')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  promoteProspect(@Param('id') id: string, @Body() dto: PromoteProspectDto) {
    return this.service.promoteToPlayer(id, dto);
  }

  @Delete('prospects/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  removeProspect(@Param('id') id: string) {
    return this.service.removeProspect(id);
  }

  @Get('reports')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  findReports(
    @Query('tenantId') tenantId?: string,
    @Query('prospectId') prospectId?: string,
    @Query('scoutId') scoutId?: string,
  ) {
    return this.service.findReports(tenantId, prospectId, scoutId);
  }

  @Get('reports/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  findReport(@Param('id') id: string) {
    return this.service.findReport(id);
  }

  @Post('reports')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  createReport(@Body() dto: CreateReportDto) {
    return this.service.createReport(dto);
  }

  @Get('manager-queue')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  managerQueue(@Query('tenantId') tenantId?: string) {
    return this.service.findManagerQueue(tenantId);
  }

  @Post('prospects/:id/manager-decision')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  async managerDecision(
    @Param('id') id: string,
    @Body() dto: ManagerDecisionDto,
    @Req() req: Request & { user: CognitoJwtPayload },
  ) {
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    const allowed = await this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
    return this.service.recordManagerDecision(
      id,
      dto,
      {
        name: req.user?.name,
        email: req.user?.email,
        role: req.user?.role,
      },
      allowed,
      req.user.sub,
    );
  }

  @Get('supervisor-queue')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  supervisorQueue(@Query('tenantId') tenantId?: string) {
    return this.service.findSupervisorQueue(tenantId);
  }

  @Patch('prospects/:id/propose-ct')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  proposeCt(@Param('id') id: string, @Body() dto: ProposeCtDto) {
    return this.service.proposeCtSchedule(id, dto);
  }

  @Patch('prospects/:id/supervisor-ct')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_captacao')
  supervisorCt(
    @Param('id') id: string,
    @Body() dto: SupervisorCtDto,
    @Req() req: { user: { name?: string; email?: string } },
  ) {
    const actorName =
      (req.user?.name as string) ||
      (req.user?.email as string) ||
      'Supervisor';
    return this.service.updateSupervisorCt(id, dto, actorName);
  }
}
