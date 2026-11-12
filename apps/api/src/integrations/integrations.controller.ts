import { BadRequestException, Controller, ForbiddenException, Get, Patch, Body, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { IntegrationsService } from './integrations.service';
import { OmieService } from './omie/omie.service';
import { TenantAccessService } from '../auth/tenant-access.service';

@Controller('settings/integrations')
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly omieService: OmieService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  /**
   * GET /settings/integrations/omie/status
   * - Sem query: status via OMIE_APP_KEY / OMIE_APP_SECRET no servidor (legado).
   * - ?tenantId=: credenciais Omie da empresa (Tenant), cifradas no banco.
   */
  @Get('omie/status')
  @UseGuards(JwtAuthGuard)
  async getOmieStatus(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
  ) {
    const tid = tenantId?.trim();
    if (tid) {
      const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
      const allowed = await this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
      try {
        this.tenantAccess.assertCanAccessTenant(allowed, tid);
      } catch {
        throw new ForbiddenException('Sem acesso à empresa solicitada.');
      }
      return this.omieService.getStatusForTenant(tid);
    }
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    if (role !== 'super_admin') {
      throw new BadRequestException('tenantId é obrigatório para consultar status Omie da empresa.');
    }
    return this.omieService.getStatus();
  }

  /** GET /settings/integrations/by-type?type=X — retorna config do tipo (sync). */
  @Get('by-type')
  @UseGuards(JwtAuthGuard)
  async getByType(@Query('type') type: string) {
    if (!type?.trim()) return null;
    return this.integrationsService.getByType(type.trim());
  }

  /** GET /settings/integrations — lista todos (superadmin). */
  @Get()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async getAll() {
    return this.integrationsService.getAll();
  }

  /** PATCH /settings/integrations — superadmin atualiza configs. */
  @Patch()
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  async update(
    @Body()
    body: {
      timesCategorias?: { spreadsheetUrl?: string; gid?: string };
      proximosJogos?: { spreadsheetUrl?: string; gid?: string };
      tabelaClassificacao?: { spreadsheetUrl?: string; gid?: string };
    },
  ) {
    return this.integrationsService.update(body ?? {});
  }
}
