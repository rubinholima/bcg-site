import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { DiretoriaService } from './diretoria.service';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { TenantAccessService } from '../auth/tenant-access.service';

@Controller('diretoria')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('diretoria')
export class DiretoriaController {
  constructor(
    private readonly service: DiretoriaService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  @Get('dashboard')
  async getDashboard(@Req() req: Request & { user: CognitoJwtPayload }) {
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    const allowed = await this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
    return this.service.getDashboard(allowed);
  }

  /** Consolidação por empresa: títulos em aberto e pedidos de compra do mês — pode levar vários segundos. */
  @Get('omie-financeiro')
  async getOmieFinanceiro(@Req() req: Request & { user: CognitoJwtPayload }) {
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    const allowed = await this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
    return this.service.getOmieFinanceiro(allowed);
  }
}
