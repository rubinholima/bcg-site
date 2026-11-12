import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { RhScopeService } from './rh-scope.service';
import { getRhAllowedTenants } from './rh-request.util';

@Controller('rh/departments')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class DepartmentsController {
  constructor(
    private readonly service: DepartmentsService,
    private readonly scope: RhScopeService,
  ) {}

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['adm_rh', 'tipos', 'futebol_comissao'])
  async findAll(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.findAll(tenantId, allowed);
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
  async create(@Req() req: Request & { user: CognitoJwtPayload }, @Body() dto: CreateDepartmentDto) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.create(dto, allowed);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  async update(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
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
