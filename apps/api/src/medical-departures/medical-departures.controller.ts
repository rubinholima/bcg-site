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
import { MedicalDeparturesService } from './medical-departures.service';
import { MedicalDeparturesReportsService } from './medical-departures-reports.service';
import {
  CreateMedicalDepartureDto,
  RegisterMedicalDepartureReturnDto,
  UpdateMedicalDepartureDto,
} from './dto/medical-departure.dto';

@Controller('medical-departures')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class MedicalDeparturesController {
  constructor(
    private readonly service: MedicalDeparturesService,
    private readonly reports: MedicalDeparturesReportsService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private async allowedTenants(req: Request & { user: CognitoJwtPayload }) {
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    return this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
  }

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async list(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('playerId') playerId?: string,
    @Query('category') category?: string,
    @Query('careType') careType?: string,
    @Query('transportMode') transportMode?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.list(
      { tenantId, playerId, category, careType, transportMode, status, from, to },
      await this.allowedTenants(req),
    );
  }

  @Get('reports/dashboard')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['relatorios_saude', 'saude'])
  async reportsDashboard(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('playerId') playerId?: string,
    @Query('category') category?: string,
    @Query('careType') careType?: string,
    @Query('transportMode') transportMode?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.getDashboard(
      { tenantId, playerId, category, careType, transportMode, status, from, to },
      await this.allowedTenants(req),
    );
  }

  @Get(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async findOne(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    return this.service.findOne(id, await this.allowedTenants(req));
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async create(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: CreateMedicalDepartureDto,
  ) {
    return this.service.create(dto, await this.allowedTenants(req), req.user.sub);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async update(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdateMedicalDepartureDto,
  ) {
    return this.service.update(id, dto, await this.allowedTenants(req));
  }

  @Post(':id/return')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async registerReturn(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: RegisterMedicalDepartureReturnDto,
  ) {
    return this.service.registerReturn(id, dto, await this.allowedTenants(req));
  }

  @Post(':id/cancel')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async cancel(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    return this.service.cancel(id, await this.allowedTenants(req));
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async delete(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    return this.service.delete(id, await this.allowedTenants(req));
  }
}
