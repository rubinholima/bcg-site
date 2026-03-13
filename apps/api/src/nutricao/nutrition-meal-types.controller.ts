import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { NutritionMealTypesService } from './nutrition-meal-types.service';
import { CreateNutritionMealTypeDto } from './dto/create-nutrition-meal-type.dto';
import { UpdateNutritionMealTypeDto } from './dto/update-nutrition-meal-type.dto';

@Controller('nutricao/nutrition-meal-types')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class NutritionMealTypesController {
  constructor(private readonly service: NutritionMealTypesService) {}

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  findAll(@Query('tenantId') tenantId?: string) {
    return this.service.findAll(tenantId);
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
  create(@Body() dto: CreateNutritionMealTypeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  update(@Param('id') id: string, @Body() dto: UpdateNutritionMealTypeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
