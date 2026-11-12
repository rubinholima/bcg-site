import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { RhCapabilityGuard } from './rh-capability.guard';
import { EmploymentsService } from './employments.service';
import { CreateEmploymentDto } from './dto/create-employment.dto';
import { UpdateEmploymentDto } from './dto/update-employment.dto';
import { TransferEmployerDto } from './dto/transfer-employer.dto';
import { RhScopeService } from './rh-scope.service';
import { RhAccessService } from './rh-access.service';
import { getRhActor, getRhAllowedTenants } from './rh-request.util';

@Controller('rh/employments')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, RhCapabilityGuard)
export class EmploymentsController {
  constructor(
    private readonly service: EmploymentsService,
    private readonly scope: RhScopeService,
    private readonly rhAccess: RhAccessService,
  ) {}

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  async findAll(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.findAll(tenantId, employeeId, status, allowed);
  }

  @Get(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  async findOne(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.findOne(id, allowed);
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  async create(@Req() req: Request & { user: CognitoJwtPayload }, @Body() dto: CreateEmploymentDto) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.create(dto, allowed);
  }

  @Post(':id/transfer-employer')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  async transferEmployer(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: TransferEmployerDto,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.transferEmployer(id, dto, allowed, getRhActor(this.scope, req));
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  async update(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdateEmploymentDto,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    if (dto.bankData !== undefined) {
      await this.rhAccess.assertCapability(req.user, 'rh_bank_manage');
    }
    return this.service.update(id, dto, allowed, getRhActor(this.scope, req));
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  async remove(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.remove(id, allowed);
  }
}
