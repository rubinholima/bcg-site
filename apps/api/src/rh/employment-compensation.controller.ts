import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { EmploymentCompensationService } from './employment-compensation.service';
import {
  CloseEmploymentCompensationItemDto,
  CreateEmploymentCompensationItemDto,
  UpdateEmploymentCompensationItemDto,
} from './dto/employment-compensation.dto';

@Controller('rh/employment-compensation')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class EmploymentCompensationController {
  constructor(private readonly service: EmploymentCompensationService) {}

  @Get('by-employment/:employmentId')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  findByEmployment(@Param('employmentId') employmentId: string) {
    return this.service.findByEmployment(employmentId);
  }

  @Post('by-employment/:employmentId')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  create(
    @Param('employmentId') employmentId: string,
    @Body() dto: CreateEmploymentCompensationItemDto,
  ) {
    return this.service.create(employmentId, dto);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  update(@Param('id') id: string, @Body() dto: UpdateEmploymentCompensationItemDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/close')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  close(@Param('id') id: string, @Body() dto: CloseEmploymentCompensationItemDto) {
    return this.service.close(id, dto);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_rh')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
