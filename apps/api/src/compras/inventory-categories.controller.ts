import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { InventoryCategoriesService } from './inventory-categories.service';
import { CreateInventoryCategoryDto } from './dto/create-inventory-category.dto';
import { UpdateInventoryCategoryDto } from './dto/update-inventory-category.dto';

@Controller('compras/inventory-categories')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class InventoryCategoriesController {
  constructor(private readonly service: InventoryCategoriesService) {}

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['adm_compras', 'adm_estoque'])
  findAll(@Query('tenantId') tenantId?: string) {
    return this.service.findAll(tenantId);
  }

  @Get(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['adm_compras', 'adm_estoque'])
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_compras')
  create(@Body() dto: CreateInventoryCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_compras')
  update(@Param('id') id: string, @Body() dto: UpdateInventoryCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_compras')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
