import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { InventoryDepartmentsService } from './inventory-departments.service';

const MODULES = ['adm_compras', 'adm_estoque', 'relatorios_adm'] as const;

@Controller('compras/inventory-departments')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
export class InventoryDepartmentsController {
  constructor(private readonly service: InventoryDepartmentsService) {}

  @Get()
  @RequireModule([...MODULES])
  list(
    @Query('tenantId') tenantId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.service.findAll(tenantId, includeInactive !== '1' && includeInactive !== 'true');
  }

  @Post()
  @RequireModule(['adm_compras', 'adm_estoque'])
  create(@Body() body: { tenantId: string; name: string }) {
    return this.service.create(body.tenantId, body.name);
  }

  @Delete(':id')
  @RequireModule(['adm_compras', 'adm_estoque'])
  deactivate(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.service.deactivate(id, tenantId);
  }
}
