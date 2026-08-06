import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { JobRolesService } from './job-roles.service';
import { CreateJobRoleDto } from './dto/create-job-role.dto';
import { UpdateJobRoleDto } from './dto/update-job-role.dto';

/** RH (todos) + Futebol (tipos/comissão) para cadastro de funções do futebol. */
const JOB_ROLE_MODULES = ['adm_rh', 'tipos', 'futebol_comissao'] as const;

@Controller('rh/job-roles')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class JobRolesController {
  constructor(private readonly service: JobRolesService) {}

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule([...JOB_ROLE_MODULES])
  findAll(
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
    return this.service.findAll(tenantId, type, footballFlag);
  }

  @Get(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule([...JOB_ROLE_MODULES])
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @RequireModule([...JOB_ROLE_MODULES])
  create(@Body() dto: CreateJobRoleDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule([...JOB_ROLE_MODULES])
  update(@Param('id') id: string, @Body() dto: UpdateJobRoleDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule([...JOB_ROLE_MODULES])
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
