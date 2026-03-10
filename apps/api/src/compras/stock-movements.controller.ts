import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { StockMovementsService } from './stock-movements.service';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';

@Controller('compras/stock-movements')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class StockMovementsController {
  constructor(private readonly service: StockMovementsService) {}

  @Get('by-product/:productId')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_compras')
  findByProduct(@Param('productId') productId: string, @Query('limit') limit?: string) {
    return this.service.findByProduct(productId, limit ? parseInt(limit, 10) : 50);
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_compras')
  create(@Body() dto: CreateStockMovementDto) {
    return this.service.create(dto);
  }
}
