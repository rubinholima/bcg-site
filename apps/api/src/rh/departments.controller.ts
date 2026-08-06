import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Controller('rh/departments')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['adm_rh', 'tipos', 'futebol_comissao'])
  findAll(@Query('tenantId') tenantId?: string) {
    return this.service.findAll(tenantId);
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
  create(@Body() dto: CreateDepartmentDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
