import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { ProcurementAccessService } from './procurement-access.service';

type AuthedRequest = Request & { user: CognitoJwtPayload };

@Controller('compras/procurement')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
export class ProcurementPermissionsController {
  constructor(private readonly access: ProcurementAccessService) {}

  @Get('permissions')
  @RequireModule(['adm_compras', 'adm_financeiro', 'diretoria', 'requisicoes', 'group_fornecedores'])
  async permissions(@Req() req: AuthedRequest) {
    return this.access.capabilityMap(req.user);
  }
}
