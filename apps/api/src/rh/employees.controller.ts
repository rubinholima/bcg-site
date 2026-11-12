import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { LinkPlayerDto } from './dto/link-player.dto';
import { RhScopeService } from './rh-scope.service';
import { getRhAllowedTenants } from './rh-request.util';

@Controller('rh/employees')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class EmployeesController {
  constructor(
    private readonly service: EmployeesService,
    private readonly scope: RhScopeService,
  ) {}

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  async findAll(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.findAll(tenantId, type, search, allowed);
  }

  @Get('by-player/:playerId')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  async findByPlayer(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('playerId') playerId: string,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.findByPlayerId(playerId, allowed);
  }

  @Post('from-player/:playerId')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  async createFromPlayer(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('playerId') playerId: string,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.createFromPlayer(playerId, allowed);
  }

  @Get(':id/unified-profile')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  async unifiedProfile(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.getUnifiedProfile(id, allowed);
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
  async create(@Req() req: Request & { user: CognitoJwtPayload }, @Body() dto: CreateEmployeeDto) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.create(dto, allowed);
  }

  @Post(':id/sync-identity')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  async syncIdentity(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.syncIdentity(id, allowed);
  }

  @Post(':id/link-player')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  async linkPlayer(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: LinkPlayerDto,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.linkPlayer(id, dto.playerId, allowed);
  }

  @Post(':id/create-player')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  async createPlayer(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.createPlayer(id, allowed);
  }

  @Post(':id/unlink-player')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  async unlinkPlayer(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.unlinkPlayer(id, allowed);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  async update(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
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
