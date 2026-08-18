import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { TenantAccessService } from '../auth/tenant-access.service';
import { SocialPedagogyReportsService } from './social-pedagogy-reports.service';

@Controller('assistencia-social/reports')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('futebol_assistencia_social')
export class SocialPedagogyReportsController {
  constructor(
    private readonly service: SocialPedagogyReportsService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private async allowedTenants(req: Request & { user: CognitoJwtPayload }) {
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    return this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
  }

  @Get('roster-validation')
  async rosterValidation(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId: string,
    @Query('category') category?: string,
  ) {
    const tid = tenantId?.trim();
    if (!tid) throw new BadRequestException('Selecione o clube/empresa.');
    const allowed = await this.allowedTenants(req);
    this.tenantAccess.assertCanAccessTenant(allowed, tid);
    return this.service.rosterValidation(tid, category);
  }

  @Get('notification/:caseId')
  notification(@Param('caseId') caseId: string) {
    return this.service.notificationReport(caseId);
  }
}
