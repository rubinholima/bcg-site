import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule, RequireRh } from '../auth/require-module.decorator';
import { RhCapabilityGuard } from './rh-capability.guard';
import { EmploymentCompensationService } from './employment-compensation.service';
import {
  CloseEmploymentCompensationItemDto,
  CreateEmploymentCompensationItemDto,
  UpdateEmploymentCompensationItemDto,
} from './dto/employment-compensation.dto';
import { RhScopeService } from './rh-scope.service';
import { getRhAllowedTenants } from './rh-request.util';

@Controller('rh/employment-compensation')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, RhCapabilityGuard)
export class EmploymentCompensationController {
  constructor(
    private readonly service: EmploymentCompensationService,
    private readonly scope: RhScopeService,
  ) {}

  @Get('by-employment/:employmentId')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  @RequireRh('rh_compensation_view')
  async findByEmployment(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('employmentId') employmentId: string,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.findByEmployment(employmentId, allowed);
  }

  @Post('by-employment/:employmentId')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  @RequireRh('rh_compensation_manage')
  async create(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('employmentId') employmentId: string,
    @Body() dto: CreateEmploymentCompensationItemDto,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.create(employmentId, dto, allowed);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  @RequireRh('rh_compensation_manage')
  async update(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdateEmploymentCompensationItemDto,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.update(id, dto, allowed);
  }

  @Post(':id/close')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  @RequireRh('rh_compensation_manage')
  async close(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: CloseEmploymentCompensationItemDto,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.close(id, dto, allowed);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  @RequireRh('rh_compensation_manage')
  async remove(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.remove(id, allowed);
  }
}
