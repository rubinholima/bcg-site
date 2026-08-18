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
import { EnfermariaService } from './enfermaria.service';
import { EnfermariaReportsService } from './enfermaria-reports.service';
import {
  CreateNursingDiagnosisDto,
  CreateNursingSessionDto,
  CreateNursingTreatmentDto,
  UpdateNursingSessionDto,
} from './dto/enfermaria.dto';

@Controller('enfermaria')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class EnfermariaController {
  constructor(
    private readonly service: EnfermariaService,
    private readonly reports: EnfermariaReportsService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private async allowedTenants(req: Request & { user: CognitoJwtPayload }) {
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    return this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
  }

  @Get('diagnoses')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  listDiagnoses() {
    return this.service.listDiagnoses();
  }

  @Post('diagnoses')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  createDiagnosis(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: CreateNursingDiagnosisDto,
  ) {
    return this.service.createDiagnosis(dto, req.user.sub);
  }

  @Get('treatments')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  listTreatments() {
    return this.service.listTreatments();
  }

  @Post('treatments')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  createTreatment(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: CreateNursingTreatmentDto,
  ) {
    return this.service.createTreatment(dto, req.user.sub);
  }

  @Get('products')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async listProducts(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId: string,
    @Query('search') search?: string,
  ) {
    return this.service.listProducts(tenantId, search, await this.allowedTenants(req));
  }

  @Get('reports/dashboard')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async reportsDashboard(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.getReportsDashboard(
      { tenantId, category, status, from, to },
      await this.allowedTenants(req),
    );
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
    return this.service.listSessions(
      { tenantId, playerId, status, from, to },
      await this.allowedTenants(req),
    );
  }

  @Get('sessions/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async findSession(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    return this.service.findSession(id, await this.allowedTenants(req));
  }

  @Post('sessions')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async createSession(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: CreateNursingSessionDto,
  ) {
    return this.service.createSession(dto, await this.allowedTenants(req), req.user.sub);
  }

  @Patch('sessions/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async updateSession(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdateNursingSessionDto,
  ) {
    return this.service.updateSession(id, dto, await this.allowedTenants(req));
  }

  @Post('sessions/:id/complete')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async completeSession(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    return this.service.completeSession(id, await this.allowedTenants(req));
  }

  @Delete('sessions/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async deleteSession(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    return this.service.deleteSession(id, await this.allowedTenants(req));
  }
}
