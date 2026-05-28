import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SocioDashboardService } from './socio-dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';

@Controller('socio/dashboard')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('socio_torcedor')
export class SocioDashboardController {
  constructor(private readonly service: SocioDashboardService) {}

  @Get('stats')
  getStats(@Query('tenantId') tenantId: string) {
    return this.service.getStats(tenantId);
  }
}
