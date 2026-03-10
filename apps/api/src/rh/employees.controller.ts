import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Controller('rh/employees')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  findAll(
    @Query('tenantId') tenantId?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(tenantId, type, search);
  }

  @Get(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  create(@Body() dto: CreateEmployeeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
