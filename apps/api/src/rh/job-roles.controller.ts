import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { JobRolesService } from './job-roles.service';
import { CreateJobRoleDto } from './dto/create-job-role.dto';
import { UpdateJobRoleDto } from './dto/update-job-role.dto';

@Controller('rh/job-roles')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class JobRolesController {
  constructor(private readonly service: JobRolesService) {}

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  findAll(@Query('tenantId') tenantId?: string, @Query('type') type?: string) {
    return this.service.findAll(tenantId, type);
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
  create(@Body() dto: CreateJobRoleDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  update(@Param('id') id: string, @Body() dto: UpdateJobRoleDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
