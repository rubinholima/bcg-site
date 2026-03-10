import { Controller, Get, Patch, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { IntegrationsService } from './integrations.service';
import { OmieService } from './omie/omie.service';

@Controller('settings/integrations')
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly omieService: OmieService,
  ) {}

  /** GET /settings/integrations/omie/status — status da integração Omie (base integração). */
  @Get('omie/status')
  @UseGuards(JwtAuthGuard)
  async getOmieStatus() {
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
