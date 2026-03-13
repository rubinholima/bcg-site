import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { NutritionMenusService } from './nutrition-menus.service';
import { NutritionMenuItemsService } from './nutrition-menu-items.service';
import { CreateNutritionMenuDto } from './dto/create-nutrition-menu.dto';
import { UpdateNutritionMenuDto } from './dto/update-nutrition-menu.dto';
import { CreateNutritionMenuItemDto } from './dto/create-nutrition-menu-item.dto';
import { UpdateNutritionMenuItemDto } from './dto/update-nutrition-menu-item.dto';

@Controller('nutricao/nutrition-menus')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class NutritionMenusController {
  constructor(
    private readonly menusService: NutritionMenusService,
    private readonly itemsService: NutritionMenuItemsService,
  ) {}

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  findAll(
    @Query('tenantId') tenantId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('dayContext') dayContext?: string,
  ) {
    return this.menusService.findAll(tenantId, categoryId, dayContext);
  }

  @Get(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  findOne(@Param('id') id: string) {
    return this.menusService.findOne(id);
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  create(@Body() dto: CreateNutritionMenuDto) {
    return this.menusService.create(dto);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  update(@Param('id') id: string, @Body() dto: UpdateNutritionMenuDto) {
    return this.menusService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  remove(@Param('id') id: string) {
    return this.menusService.remove(id);
  }

  @Get(':menuId/items')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  getItems(@Param('menuId') menuId: string) {
    return this.itemsService.findAllByMenu(menuId);
  }

  @Post(':menuId/items')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  addItem(@Param('menuId') menuId: string, @Body() dto: CreateNutritionMenuItemDto) {
    return this.itemsService.create(menuId, dto);
  }

  @Patch('items/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  updateItem(@Param('id') id: string, @Body() dto: UpdateNutritionMenuItemDto) {
    return this.itemsService.update(id, dto);
  }

  @Delete('items/:id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_nutricao')
  removeItem(@Param('id') id: string) {
    return this.itemsService.remove(id);
  }
}
