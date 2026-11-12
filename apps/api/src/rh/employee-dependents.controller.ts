import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { EmployeeDependentsService } from './employee-dependents.service';
import {
  CreateEmployeeDependentDto,
  SyncEmployeeDependentsDto,
  UpdateEmployeeDependentDto,
} from './dto/employee-dependent.dto';
import { RhScopeService } from './rh-scope.service';
import { getRhAllowedTenants } from './rh-request.util';

@Controller('rh/employees/:employeeId/dependents')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('adm_rh')
export class EmployeeDependentsController {
  constructor(
    private readonly service: EmployeeDependentsService,
    private readonly scope: RhScopeService,
  ) {}

  @Get()
  async findAll(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('employeeId') employeeId: string,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.findByEmployee(employeeId, allowed);
  }

  @Post()
  async create(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateEmployeeDependentDto,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.create(employeeId, dto, allowed);
  }

  @Post('sync')
  async sync(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('employeeId') employeeId: string,
    @Body() dto: SyncEmployeeDependentsDto,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.sync(employeeId, dto, allowed);
  }
}

@Controller('rh/dependents')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('adm_rh')
export class EmployeeDependentItemController {
  constructor(
    private readonly service: EmployeeDependentsService,
    private readonly scope: RhScopeService,
  ) {}

  @Patch(':id')
  async update(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDependentDto,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.update(id, dto, allowed);
  }

  @Delete(':id')
  async remove(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.remove(id, allowed);
  }
}
