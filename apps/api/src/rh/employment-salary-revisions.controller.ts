import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule, RequireRh } from '../auth/require-module.decorator';
import { RhCapabilityGuard } from './rh-capability.guard';
import { EmploymentSalaryRevisionsService } from './employment-salary-revisions.service';
import { CreateEmploymentSalaryRevisionDto } from './dto/employment-compensation.dto';
import { RhScopeService } from './rh-scope.service';
import { getRhActor, getRhAllowedTenants } from './rh-request.util';

@Controller('rh/employment-salary-revisions')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, RhCapabilityGuard)
export class EmploymentSalaryRevisionsController {
  constructor(
    private readonly service: EmploymentSalaryRevisionsService,
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
    @Body() dto: CreateEmploymentSalaryRevisionDto,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.create(employmentId, dto, allowed, getRhActor(this.scope, req));
  }
}
