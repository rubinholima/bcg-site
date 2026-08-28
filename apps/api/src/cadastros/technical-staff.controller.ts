import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { TechnicalStaffService } from './technical-staff.service';
import { PersonalDisciplineHistoryService } from '../futebol-relatorios/personal-discipline-history.service';
import { CreateTechnicalStaffDto } from './dto/create-technical-staff.dto';
import { UpdateTechnicalStaffDto } from './dto/update-technical-staff.dto';

@Controller('technical-staff')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class TechnicalStaffController {
  constructor(
    private readonly service: TechnicalStaffService,
    private readonly disciplineHistory: PersonalDisciplineHistoryService,
  ) {}

  @Get()
  findAll(
    @Query('tenantId') tenantId?: string,
    @Query('category') category?: string,
    @Query('role') role?: string,
    @Query('jobRoleId') jobRoleId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll({ tenantId, category, role, jobRoleId, search });
  }

  @Get('job-roles')
  findJobRoles(@Query('tenantId') tenantId: string) {
    return this.service.findJobRoles(tenantId);
  }

  @Get(':id/discipline-history')
  findDisciplineHistory(
    @Param('id') id: string,
    @Query('category') category?: string,
    @Query('season') season?: string,
    @Query('competition') competition?: string,
  ) {
    const seasonNum = season?.trim() ? Number(season.trim()) : undefined;
    return this.disciplineHistory.getStaffHistory(id, {
      category: category?.trim() || null,
      season: Number.isFinite(seasonNum) ? seasonNum : null,
      competition: competition?.trim() || null,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateTechnicalStaffDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTechnicalStaffDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
