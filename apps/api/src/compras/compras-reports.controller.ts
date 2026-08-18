import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { ComprasReportsService } from './compras-reports.service';

const REPORT_MODULES = ['relatorios_adm', 'adm_compras', 'adm_estoque'] as const;

@Controller('compras/reports')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class ComprasReportsController {
  constructor(private readonly service: ComprasReportsService) {}

  @Get('departments')
  @UseGuards(ModuleAccessGuard)
  @RequireModule([...REPORT_MODULES])
  listDepartments(@Query('tenantId') tenantId: string) {
    return this.service.listDepartments(tenantId);
  }

  @Get('estoque-compras')
  @UseGuards(ModuleAccessGuard)
  @RequireModule([...REPORT_MODULES])
  estoqueCompras(
    @Query('tenantId') tenantId: string,
    @Query('scope') scope?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('departmentName') departmentName?: string,
    @Query('inventoryKind') inventoryKind?: string,
  ) {
    return this.service.buildReport({
      tenantId,
      scope: scope ?? 'geral',
      from,
      to,
      departmentName,
      inventoryKind,
    });
  }
}
