import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { NutritionReportsService } from './nutrition-reports.service';

@Controller('nutricao/reports')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('adm_nutricao')
export class NutritionReportsController {
  constructor(private readonly service: NutritionReportsService) {}

  @Get('kitchen-menu')
  kitchenMenu(
    @Query('tenantId') tenantId: string,
    @Query('categoryId') categoryId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.service.kitchenMenuReport({ tenantId, categoryId, startDate, endDate });
  }

  @Get('supplementation')
  supplementation(
    @Query('tenantId') tenantId: string,
    @Query('categoryId') categoryId?: string,
    @Query('playerId') playerId?: string,
    @Query('scope') scope?: 'all' | 'team' | 'category' | 'individual',
  ) {
    return this.service.supplementationReport({ tenantId, categoryId, playerId, scope });
  }
}
