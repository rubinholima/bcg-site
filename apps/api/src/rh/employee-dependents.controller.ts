import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { EmployeeDependentsService } from './employee-dependents.service';
import {
  CreateEmployeeDependentDto,
  SyncEmployeeDependentsDto,
  UpdateEmployeeDependentDto,
} from './dto/employee-dependent.dto';

@Controller('rh/employees/:employeeId/dependents')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('adm_rh')
export class EmployeeDependentsController {
  constructor(private readonly service: EmployeeDependentsService) {}

  @Get()
  findAll(@Param('employeeId') employeeId: string) {
    return this.service.findByEmployee(employeeId);
  }

  @Post()
  create(@Param('employeeId') employeeId: string, @Body() dto: CreateEmployeeDependentDto) {
    return this.service.create(employeeId, dto);
  }

  @Post('sync')
  sync(@Param('employeeId') employeeId: string, @Body() dto: SyncEmployeeDependentsDto) {
    return this.service.sync(employeeId, dto);
  }
}

@Controller('rh/dependents')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('adm_rh')
export class EmployeeDependentItemController {
  constructor(private readonly service: EmployeeDependentsService) {}

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDependentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
