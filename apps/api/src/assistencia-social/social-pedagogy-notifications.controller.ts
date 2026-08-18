import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { SocialPedagogyCasesService } from './social-pedagogy-cases.service';

@Controller('assistencia-social/notifications')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('futebol_assistencia_social')
export class SocialPedagogyNotificationsController {
  constructor(private readonly cases: SocialPedagogyCasesService) {}

  @Get('novos-aptos')
  listNovosAptos(@Query('tenantId') tenantId: string) {
    return this.cases.listAptoNotifications(tenantId);
  }
}
