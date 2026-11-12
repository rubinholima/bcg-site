import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { JobRolesService } from './job-roles.service';
import { CreateJobRoleDto } from './dto/create-job-role.dto';
import { UpdateJobRoleDto } from './dto/update-job-role.dto';
import { RhScopeService } from './rh-scope.service';
import { getRhAllowedTenants } from './rh-request.util';

const JOB_ROLE_MODULES = ['adm_rh', 'tipos', 'futebol_comissao'] as const;

@Controller('rh/job-roles')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class JobRolesController {
  constructor(
    private readonly service: JobRolesService,
    private readonly scope: RhScopeService,
  ) {}

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule([...JOB_ROLE_MODULES])
  async findAll(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('type') type?: string,
    @Query('forFootball') forFootball?: string,
  ) {
    const footballFlag =
      forFootball === '1' || forFootball === 'true'
        ? true
        : forFootball === '0' || forFootball === 'false'
          ? false
          : undefined;
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.findAll(tenantId, type, footballFlag, allowed);
  }

  @Get(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule([...JOB_ROLE_MODULES])
  async findOne(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.findOne(id, allowed);
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @RequireModule([...JOB_ROLE_MODULES])
  async create(@Req() req: Request & { user: CognitoJwtPayload }, @Body() dto: CreateJobRoleDto) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.create(dto, allowed);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule([...JOB_ROLE_MODULES])
  async update(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdateJobRoleDto,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.update(id, dto, allowed);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule([...JOB_ROLE_MODULES])
  async remove(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.remove(id, allowed);
  }
}
