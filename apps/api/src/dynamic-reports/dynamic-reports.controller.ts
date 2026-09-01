import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { TenantAccessService } from '../auth/tenant-access.service';
import { DynamicReportsService } from './dynamic-reports.service';
import { RunDynamicReportDto } from './dto/run-dynamic-report.dto';

const DYNAMIC_REPORT_MODULES = [
  'relatorios_adm',
  'relatorios_futebol',
  'adm_rh',
  'adm_financeiro',
] as const;

@Controller('dynamic-reports')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class DynamicReportsController {
  constructor(
    private readonly service: DynamicReportsService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private async allowedTenants(req: Request & { user: CognitoJwtPayload }) {
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    return this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
  }

  private actorRole(req: Request & { user: CognitoJwtPayload }) {
    return req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
  }

  @Get('meta')
  @UseGuards(ModuleAccessGuard)
  @RequireModule([...DYNAMIC_REPORT_MODULES])
  getMeta(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('population') population?: string,
  ) {
    return this.service.getMeta(
      req.user.sub,
      this.actorRole(req),
      population?.trim() || 'player.athletes',
    );
  }

  @Post('run')
  @UseGuards(ModuleAccessGuard)
  @RequireModule([...DYNAMIC_REPORT_MODULES])
  async runReport(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: RunDynamicReportDto,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.runReport(dto, req.user.sub, this.actorRole(req), allowed);
  }
}
