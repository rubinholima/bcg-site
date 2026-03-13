import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { NutritionCategoriesService } from './nutrition-categories.service';
import { CreateNutritionCategoryDto } from './dto/create-nutrition-category.dto';
import { UpdateNutritionCategoryDto } from './dto/update-nutrition-category.dto';

@Controller('nutricao/nutrition-categories')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class NutritionCategoriesController {
  constructor(private readonly service: NutritionCategoriesService) {}

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
  create(@Body() dto: CreateNutritionCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  update(@Param('id') id: string, @Body() dto: UpdateNutritionCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
