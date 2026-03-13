import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { AssetCategoriesService } from './asset-categories.service';
import { CreateAssetCategoryDto } from './dto/create-asset-category.dto';
import { UpdateAssetCategoryDto } from './dto/update-asset-category.dto';

@Controller('patrimonio/asset-categories')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class AssetCategoriesController {
  constructor(private readonly service: AssetCategoriesService) {}

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_patrimonio')
  findAll(@Query('tenantId') tenantId?: string) {
    return this.service.findAll(tenantId);
  }

  @Get(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_patrimonio')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_patrimonio')
  create(@Body() dto: CreateAssetCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_patrimonio')
  update(@Param('id') id: string, @Body() dto: UpdateAssetCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_patrimonio')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
