import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { LeavePeriodsService } from './leave-periods.service';
import { CreateLeavePeriodDto } from './dto/create-leave-period.dto';
import { UpdateLeavePeriodDto } from './dto/update-leave-period.dto';

@Controller('rh/leave-periods')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class LeavePeriodsController {
  constructor(private readonly service: LeavePeriodsService) {}

  @Get('by-employment/:employmentId')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  findByEmployment(@Param('employmentId') employmentId: string) {
    return this.service.findByEmployment(employmentId);
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
  create(@Body() dto: CreateLeavePeriodDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  update(@Param('id') id: string, @Body() dto: UpdateLeavePeriodDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
