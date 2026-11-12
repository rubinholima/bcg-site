import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule, RequireRh } from '../auth/require-module.decorator';
import { RhCapabilityGuard } from './rh-capability.guard';
import { RhDashboardService } from './rh-dashboard.service';
import { RhScopeService } from './rh-scope.service';
import { getRhAllowedTenants } from './rh-request.util';

@Controller('rh/dashboard')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard, RhCapabilityGuard)
@RequireModule(['adm_rh', 'rh_view'])
export class RhDashboardController {
  constructor(
    private readonly service: RhDashboardService,
    private readonly scope: RhScopeService,
  ) {}

  @Get('kpis')
  @RequireRh('rh_view')
  async kpis(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
  ) {
    const allowed = await getRhAllowedTenants(this.scope, req);
    return this.service.getKpis(tenantId, allowed);
  }
}
