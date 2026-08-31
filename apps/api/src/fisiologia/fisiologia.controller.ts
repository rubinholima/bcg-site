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
import { FisiologiaService } from './fisiologia.service';
import { FisiologiaTransitionService } from './fisiologia-transition.service';
import { FisiologiaReportsService, FISIOLOGIA_REPORT_KINDS } from './fisiologia-reports.service';
import { CreatePhysioTransitionProgramEntryDto } from './dto/fisiologia-transition.dto';
import {
  CreatePhysiologyAssessmentDto,
  CreatePhysiologyHydrationDto,
  CreatePhysiologyLoadSessionDto,
  UpdatePhysiologyAssessmentDto,
  UpdatePhysiologyHydrationDto,
  UpdatePhysiologyLoadSessionDto,
} from './dto/fisiologia.dto';

@Controller('fisiologia')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class FisiologiaController {
  constructor(
    private readonly service: FisiologiaService,
    private readonly reports: FisiologiaReportsService,
    private readonly transitions: FisiologiaTransitionService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private async allowedTenants(req: Request & { user: CognitoJwtPayload }) {
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    return this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
  }

  @Get('players/:playerId/context')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_fisiologia')
  async playerContext(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('playerId') playerId: string,
  ) {
    return this.service.getPlayerContext(playerId, await this.allowedTenants(req));
  }

  @Get('assessments')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_fisiologia')
  async listAssessments(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('playerId') playerId?: string,
    @Query('category') category?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.listAssessments({
      tenantId,
      playerId,
      category,
      from,
      to,
      allowedTenants: await this.allowedTenants(req),
    });
  }

  @Get('assessments/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_fisiologia')
  async findAssessment(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    return this.service.findAssessment(id, await this.allowedTenants(req));
  }

  @Post('assessments')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_fisiologia')
  async createAssessment(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: CreatePhysiologyAssessmentDto,
  ) {
    return this.service.createAssessment(dto, await this.allowedTenants(req));
  }

  @Patch('assessments/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_fisiologia')
  async updateAssessment(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdatePhysiologyAssessmentDto,
  ) {
    return this.service.updateAssessment(id, dto, await this.allowedTenants(req));
  }

  @Delete('assessments/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_fisiologia')
  async deleteAssessment(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    return this.service.deleteAssessment(id, await this.allowedTenants(req));
  }

  @Get('players/:playerId/assessments')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_fisiologia')
  async listPlayerAssessments(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('playerId') playerId: string,
  ) {
    return this.service.listAssessmentsByPlayer(playerId, await this.allowedTenants(req));
  }

  @Post('players/:playerId/import-legacy')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_fisiologia')
  async importLegacy(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('playerId') playerId: string,
  ) {
    await this.allowedTenants(req);
    return this.service.importLegacyAssessments(playerId);
  }

  @Get('hydrations')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_fisiologia')
  async listHydrations(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('playerId') playerId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.listHydrations({
      tenantId,
      playerId,
      from,
      to,
      allowedTenants: await this.allowedTenants(req),
    });
  }

  @Post('hydrations')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_fisiologia')
  async createHydration(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: CreatePhysiologyHydrationDto,
  ) {
    return this.service.createHydration(dto, await this.allowedTenants(req));
  }

  @Patch('hydrations/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_fisiologia')
  async updateHydration(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdatePhysiologyHydrationDto,
  ) {
    return this.service.updateHydration(id, dto, await this.allowedTenants(req));
  }

  @Delete('hydrations/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_fisiologia')
  async deleteHydration(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    return this.service.deleteHydration(id, await this.allowedTenants(req));
  }

  @Get('load-sessions/category-roster')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_fisiologia')
  async categoryRoster(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId: string,
    @Query('category') category: string,
  ) {
    return this.service.categoryRoster(tenantId, category, await this.allowedTenants(req));
  }

  @Get('load-sessions')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_fisiologia')
  async listLoadSessions(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('category') category?: string,
    @Query('sessionType') sessionType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.listLoadSessions({
      tenantId,
      category,
      sessionType,
      from,
      to,
      allowedTenants: await this.allowedTenants(req),
    });
  }

  @Get('load-sessions/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_fisiologia')
  async findLoadSession(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    return this.service.findLoadSession(id, await this.allowedTenants(req));
  }

  @Post('load-sessions')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_fisiologia')
  async createLoadSession(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: CreatePhysiologyLoadSessionDto,
  ) {
    return this.service.createLoadSession(dto, await this.allowedTenants(req));
  }

  @Patch('load-sessions/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_fisiologia')
  async updateLoadSession(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdatePhysiologyLoadSessionDto,
  ) {
    return this.service.updateLoadSession(id, dto, await this.allowedTenants(req));
  }

  @Delete('load-sessions/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_fisiologia')
  async deleteLoadSession(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    return this.service.deleteLoadSession(id, await this.allowedTenants(req));
  }

  @Get('players/:playerId/transition-programs')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_fisiologia')
  async listPlayerTransitionPrograms(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('playerId') playerId: string,
  ) {
    return this.transitions.listPlayerPrograms(playerId, await this.allowedTenants(req));
  }

  @Get('transition-programs/summary')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_fisiologia')
  async transitionProgramsSummary(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('category') category?: string,
  ) {
    return this.transitions.getOperationalSummary(
      { tenantId, category },
      await this.allowedTenants(req),
    );
  }

  @Get('transition-programs')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_fisiologia')
  async listTransitionPrograms(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    return this.transitions.listPrograms(
      { tenantId, category, status },
      await this.allowedTenants(req),
    );
  }

  @Get('transition-programs/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_fisiologia')
  async findTransitionProgram(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    return this.transitions.findProgram(id, await this.allowedTenants(req));
  }

  @Post('transition-programs/:id/entries')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_fisiologia')
  async createTransitionProgramEntry(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: CreatePhysioTransitionProgramEntryDto,
  ) {
    return this.transitions.createProgramEntry(
      id,
      dto,
      await this.allowedTenants(req),
      req.user.sub,
    );
  }

  @Get('reports/dashboard')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('futebol_fisiologia')
  async report(
    @Query('tenantId') tenantId: string,
    @Query('kind') kind?: string,
    @Query('category') category?: string,
    @Query('playerId') playerId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('month') month?: string,
  ) {
    const reportKind = FISIOLOGIA_REPORT_KINDS.includes(kind as (typeof FISIOLOGIA_REPORT_KINDS)[number])
      ? (kind as (typeof FISIOLOGIA_REPORT_KINDS)[number])
      : 'geral';
    return this.reports.buildReport({
      tenantId,
      kind: reportKind,
      category,
      playerId,
      from,
      to,
      month,
    });
  }
}
