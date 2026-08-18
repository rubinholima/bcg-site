import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { PlayerSchoolEnrollmentsService } from './player-school-enrollments.service';
import {
  CreatePlayerSchoolEnrollmentDto,
  UpdatePlayerSchoolEnrollmentDto,
} from './dto/player-school-enrollment.dto';

@Controller('assistencia-social/school-enrollments')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('futebol_assistencia_social')
export class PlayerSchoolEnrollmentsController {
  constructor(private readonly service: PlayerSchoolEnrollmentsService) {}

  @Get('by-player/:playerId')
  findByPlayer(@Param('playerId') playerId: string) {
    return this.service.findByPlayer(playerId);
  }

  @Post()
  create(@Body() dto: CreatePlayerSchoolEnrollmentDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlayerSchoolEnrollmentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
