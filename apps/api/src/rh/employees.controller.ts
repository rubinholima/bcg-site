import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { LinkPlayerDto } from './dto/link-player.dto';

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

  @Get('by-player/:playerId')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  findByPlayer(@Param('playerId') playerId: string) {
    return this.service.findByPlayerId(playerId);
  }

  @Post('from-player/:playerId')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  createFromPlayer(@Param('playerId') playerId: string) {
    return this.service.createFromPlayer(playerId);
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

  @Post(':id/sync-identity')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  syncIdentity(@Param('id') id: string) {
    return this.service.syncIdentity(id);
  }

  @Post(':id/link-player')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  linkPlayer(@Param('id') id: string, @Body() dto: LinkPlayerDto) {
    return this.service.linkPlayer(id, dto.playerId);
  }

  @Post(':id/create-player')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  createPlayer(@Param('id') id: string) {
    return this.service.createPlayer(id);
  }

  @Post(':id/unlink-player')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  unlinkPlayer(@Param('id') id: string) {
    return this.service.unlinkPlayer(id);
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
