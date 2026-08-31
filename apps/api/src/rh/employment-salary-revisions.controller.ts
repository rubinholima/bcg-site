import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { EmploymentSalaryRevisionsService } from './employment-salary-revisions.service';
import { CreateEmploymentSalaryRevisionDto } from './dto/employment-compensation.dto';

@Controller('rh/employment-salary-revisions')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class EmploymentSalaryRevisionsController {
  constructor(private readonly service: EmploymentSalaryRevisionsService) {}

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
    @Body() dto: CreateEmploymentSalaryRevisionDto,
  ) {
    return this.service.create(employmentId, dto);
  }
}
