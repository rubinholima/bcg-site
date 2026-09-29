import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { SeasonHighlightsAccess } from '../auth/require-module.decorator';
import { ModulesService } from '../modules/modules.service';
import { SeasonHighlightsService } from './season-highlights.service';

type AuthedRequest = Request & { user: CognitoJwtPayload };

@Controller('futebol-treinadores/season-highlights')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@SeasonHighlightsAccess()
export class SeasonHighlightsController {
  constructor(
    private readonly service: SeasonHighlightsService,
    private readonly modulesService: ModulesService,
  ) {}

  private parseSeason(value?: string): number | undefined {
    if (!value?.trim()) return undefined;
    const n = Number(value);
    if (!Number.isFinite(n)) throw new BadRequestException('Temporada inválida.');
    return Math.trunc(n);
  }

  @Get('summary')
  getSummary(
    @Query('tenantId') tenantId: string,
    @Query('season') season?: string,
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório.');
    return this.service.getManagementSummary(tenantId.trim(), this.parseSeason(season));
  }

  @Get('boston-city')
  listBoston(
    @Query('tenantId') tenantId: string,
    @Query('season') season?: string,
    @Query('category') category?: string,
    @Query('competition') competition?: string,
    @Query('search') search?: string,
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório.');
    return this.service.listBostonCity({
      tenantId: tenantId.trim(),
      season: this.parseSeason(season),
      category: category?.trim() || undefined,
      competition: competition?.trim() || undefined,
      search: search?.trim() || undefined,
    });
  }

  @Get('boston-city/:playerId')
  getBostonPlayer(
    @Param('playerId') playerId: string,
    @Query('tenantId') tenantId: string,
    @Query('season') season?: string,
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório.');
    return this.service.getBostonCityPlayerDetail(
      tenantId.trim(),
      playerId,
      this.parseSeason(season),
    );
  }

  @Get('opponent-radar')
  listOpponent(
    @Query('tenantId') tenantId: string,
    @Query('season') season?: string,
    @Query('category') category?: string,
    @Query('competition') competition?: string,
    @Query('club') club?: string,
    @Query('search') search?: string,
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório.');
    return this.service.listOpponentRadar({
      tenantId: tenantId.trim(),
      season: this.parseSeason(season),
      category: category?.trim() || undefined,
      competition: competition?.trim() || undefined,
      club: club?.trim() || undefined,
      search: search?.trim() || undefined,
    });
  }

  @Get('opponent-radar/:profileId')
  getOpponentProfile(
    @Param('profileId') profileId: string,
    @Query('tenantId') tenantId: string,
    @Query('season') season?: string,
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório.');
    return this.service.getOpponentProfileDetail(
      tenantId.trim(),
      profileId,
      this.parseSeason(season),
    );
  }

  @Patch('opponent-radar/:profileId/management')
  patchOpponentManagement(
    @Param('profileId') profileId: string,
    @Query('tenantId') tenantId: string,
    @Body() body: { managementNotes?: string; managementStatus?: string },
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório.');
    return this.service.updateOpponentProfileManagement(tenantId.trim(), profileId, body);
  }

  @Post('opponent-radar/:profileId/send-to-captacao')
  async sendToCaptacao(
    @Param('profileId') profileId: string,
    @Query('tenantId') tenantId: string,
    @Req() req: AuthedRequest,
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório.');
    const slugs = await this.modulesService.getSlugsForActor(
      req.user.sub,
      req.user.role ?? 'user',
    );
    const hasCaptacao = slugs.includes('futebol_captacao');
    return this.service.sendToCaptacao(tenantId.trim(), profileId, hasCaptacao);
  }

  @Get('export')
  async exportData(
    @Query('tenantId') tenantId: string,
    @Query('season') season?: string,
    @Query('tab') tab?: string,
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório.');
    const year = this.parseSeason(season) ?? new Date().getFullYear();
    const kind = tab === 'opponent' ? 'opponent' : 'boston';
    const rows = await this.service.buildExportRows(tenantId.trim(), year, kind);
    return { season: year, tab: kind, rows };
  }
}
