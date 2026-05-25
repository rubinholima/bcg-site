import {
  Controller,
  ForbiddenException,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { TenantAccessService } from '../auth/tenant-access.service';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  @Get('stats')
  async getStats(@Req() req: Request & { user: CognitoJwtPayload }) {
    const role = req.user.role ?? req.user['cognito:groups']?.[0];
    if (role !== 'super_admin') {
      throw new ForbiddenException('Painel master restrito ao super admin.');
    }
    return this.dashboardService.getStats();
  }

  @Get('company-stats')
  async getCompanyStats(@Req() req: Request & { user: CognitoJwtPayload }) {
    const role = req.user.role ?? req.user['cognito:groups']?.[0];
    if (role !== 'company_admin') {
      throw new ForbiddenException('Painel da empresa restrito ao company admin.');
    }
    const tenantIds = await this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
    return this.dashboardService.getCompanyStats(tenantIds);
  }
}
