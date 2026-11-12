import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { LeavePeriodsService } from './leave-periods.service';
import { CreateLeavePeriodDto } from './dto/create-leave-period.dto';
import { UpdateLeavePeriodDto } from './dto/update-leave-period.dto';
import { RhScopeService } from './rh-scope.service';
import { getRhAllowedTenants } from './rh-request.util';

@Controller('rh/leave-periods')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class LeavePeriodsController {
  constructor(
    private readonly service: LeavePeriodsService,
    private readonly scope: RhScopeService,
  ) {}

  @Get('by-employment/:employmentId')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  async findByEmployment(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('employmentId') employmentId: string,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.findByEmployment(employmentId, allowed);
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
  async create(@Req() req: Request & { user: CognitoJwtPayload }, @Body() dto: CreateLeavePeriodDto) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.create(dto, allowed);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  async update(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdateLeavePeriodDto,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.update(id, dto, allowed);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  async remove(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.remove(id, allowed);
  }
}
