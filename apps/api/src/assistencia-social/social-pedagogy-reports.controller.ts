import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { SocialPedagogyReportsService } from './social-pedagogy-reports.service';

@Controller('assistencia-social/reports')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('futebol_assistencia_social')
export class SocialPedagogyReportsController {
  constructor(private readonly service: SocialPedagogyReportsService) {}

  @Get('roster-validation')
  rosterValidation(@Query('tenantId') tenantId: string, @Query('category') category?: string) {
    return this.service.rosterValidation(tenantId, category);
  }

  @Get('notification/:caseId')
  notification(@Param('caseId') caseId: string) {
    return this.service.notificationReport(caseId);
  }
}
