import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { PurchaseRequisitionsService } from './purchase-requisitions.service';
import { CreatePurchaseRequisitionDto } from './dto/create-purchase-requisition.dto';
import { UpdatePurchaseRequisitionDto } from './dto/update-purchase-requisition.dto';

@Controller('compras/purchase-requisitions')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class PurchaseRequisitionsController {
  constructor(private readonly service: PurchaseRequisitionsService) {}

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_compras')
  findAll(@Query('tenantId') tenantId?: string, @Query('status') status?: string) {
    return this.service.findAll(tenantId, status);
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
  create(@Body() dto: CreatePurchaseRequisitionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_compras')
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseRequisitionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_compras')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
