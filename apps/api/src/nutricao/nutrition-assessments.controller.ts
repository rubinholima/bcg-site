import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { NutritionAssessmentsService } from './nutrition-assessments.service';
import { CreateNutritionAssessmentDto } from './dto/create-nutrition-assessment.dto';
import { UpdateNutritionAssessmentDto } from './dto/update-nutrition-assessment.dto';

@Controller('nutricao/nutrition-assessments')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class NutritionAssessmentsController {
  constructor(private readonly service: NutritionAssessmentsService) {}

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  findByTenant(@Query('tenantId') tenantId: string, @Query('playerId') playerId?: string) {
    return this.service.findByTenant(tenantId, playerId);
  }

  @Get('by-player/:playerId')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  findByPlayer(@Param('playerId') playerId: string) {
    return this.service.findByPlayer(playerId);
  }

  @Get(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  create(@Body() dto: CreateNutritionAssessmentDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  update(@Param('id') id: string, @Body() dto: UpdateNutritionAssessmentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
