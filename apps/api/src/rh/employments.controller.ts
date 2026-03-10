import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { EmploymentsService } from './employments.service';
import { CreateEmploymentDto } from './dto/create-employment.dto';
import { UpdateEmploymentDto } from './dto/update-employment.dto';

@Controller('rh/employments')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class EmploymentsController {
  constructor(private readonly service: EmploymentsService) {}

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  findAll(
    @Query('tenantId') tenantId?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll(tenantId, employeeId, status);
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
  create(@Body() dto: CreateEmploymentDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  update(@Param('id') id: string, @Body() dto: UpdateEmploymentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
