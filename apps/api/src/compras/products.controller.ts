import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('compras/products')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_compras')
  findAll(@Query('tenantId') tenantId?: string, @Query('search') search?: string) {
    return this.service.findAll(tenantId, search);
  }

  @Get('stock-alerts')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_compras')
  getStockAlerts(@Query('tenantId') tenantId?: string) {
    return this.service.getStockAlerts(tenantId);
  }

  @Get(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_compras')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_compras')
  create(@Body() dto: CreateProductDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_compras')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_compras')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
