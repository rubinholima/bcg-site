import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { TenantAccessService } from '../auth/tenant-access.service';
import { PlayersService } from './players.service';
import { CreatePlayerDto } from './dto/create-player.dto';
import { UpdatePlayerDto } from './dto/update-player.dto';
import { FmfMatchReportService } from '../fmf-scraper/fmf-match-report.service';
import { PersonalDisciplineHistoryService } from '../futebol-relatorios/personal-discipline-history.service';
import { PlayerDossierService } from './player-dossier.service';

@Controller('players')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class PlayersController {
  constructor(
    private readonly service: PlayersService,
    private readonly tenantAccess: TenantAccessService,
    private readonly fmfMatchReports: FmfMatchReportService,
    private readonly disciplineHistory: PersonalDisciplineHistoryService,
    private readonly playerDossier: PlayerDossierService,
  ) {}

  private async allowedTenants(req: Request & { user: CognitoJwtPayload }) {
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    return this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
  }

  @Get()
  async findAll(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('category') category?: string,
    @Query('position') position?: string,
    @Query('search') search?: string,
    @Query('situation') situation?: string,
    @Query('availability') availability?: string,
    @Query('archived') archived?: string,
    @Query('loaned') loaned?: string,
    @Query('forPsychology') forPsychology?: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.findAll(
      {
        tenantId,
        category,
        position,
        search,
        situation,
        availability,
        archived: archived === '1' || archived === 'true',
        loaned: loaned === '1' || loaned === 'true',
        forPsychology: forPsychology === '1' || forPsychology === 'true',
      },
      allowed,
    );
  }

  @Get(':id/travel-history')
  async findTravelHistory(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.findTravelHistory(id, allowed);
  }

  @Get(':id/subida-history')
  async findSubidaHistory(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.findSubidaHistory(id, allowed);
  }

  @Get(':id/training-history')
  async findTrainingHistory(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.findTrainingHistory(id, allowed);
  }

  @Get(':id/nutrition-history')
  async findNutritionHistory(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.findNutritionHistory(id, allowed);
  }

  @Get(':id/nutrition-context')
  async findNutritionContext(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.findNutritionContext(id, allowed);
  }

  @Get(':id/social-pedagogy-context')
  async findSocialPedagogyContext(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.findSocialPedagogyContext(id, allowed);
  }

  @Get(':id/agenda')
  async findAgenda(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.findAgendaTimeline(id, from, to, allowed);
  }

  @Get(':id/contracts-overview')
  async findContractsOverview(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.findContractsOverview(id, allowed);
  }

  @Get(':id/fmf-stats')
  async findFmfStats(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await this.allowedTenants(req);
    await this.service.findOne(id, allowed);
    return this.fmfMatchReports.getPlayerStats(id);
  }

  @Get(':id/discipline-history')
  async findDisciplineHistory(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Query('category') category?: string,
    @Query('season') season?: string,
    @Query('competition') competition?: string,
  ) {
    const allowed = await this.allowedTenants(req);
    await this.service.findOne(id, allowed);
    const seasonNum = season?.trim() ? Number(season.trim()) : undefined;
    return this.disciplineHistory.getPlayerHistory(id, {
      category: category?.trim() || null,
      season: Number.isFinite(seasonNum) ? seasonNum : null,
      competition: competition?.trim() || null,
    });
  }

  /** PDF de contrato jurídico — autenticado (legal/* não é público no CDN). */
  @Get(':id/contract-documents/:docId/file')
  async streamContractDocument(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Param('docId') docId: string,
  ) {
    const allowed = await this.allowedTenants(req);
    const { buffer, filename } = await this.service.streamLegalDocumentFile(id, docId, allowed);
    const safeFilename = filename.replace(/[^a-zA-Z0-9\u00C0-\u024F\s._-]/g, '_');
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `inline; filename="${safeFilename}"`,
    });
  }

  @Post(':id/registration-documents')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async uploadRegistrationDocument(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype?: string } | undefined,
    @Body('name') name?: string,
    @Body('documentType') documentType?: string,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Envie um arquivo (campo "file").');
    }
    const allowed = await this.allowedTenants(req);
    return this.service.uploadRegistrationDocument(
      id,
      file,
      name ?? '',
      documentType ?? '',
      allowed,
    );
  }

  @Get(':id/delete-impact')
  async getDeleteImpact(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.getDeleteImpact(id, allowed);
  }

  @Get(':id/dossier')
  async findDossier(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Query('sections') sections?: string,
    @Query('season') seasonRaw?: string,
  ) {
    const allowed = await this.allowedTenants(req);
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    const season = seasonRaw?.trim() ? Number(seasonRaw.trim()) : undefined;
    return this.playerDossier.buildDossier({
      playerId: id,
      allowedTenantIds: allowed,
      actorSub: req.user.sub,
      role,
      optionalSectionsRaw: sections,
      season: Number.isFinite(season) ? season : undefined,
    });
  }

  @Get(':id')
  async findOne(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const allowed = await this.allowedTenants(req);
    return this.service.findOne(id, allowed);
  }

  @Post()
  async create(@Req() req: Request & { user: CognitoJwtPayload }, @Body() dto: CreatePlayerDto) {
    const allowed = await this.allowedTenants(req);
    return this.service.create(dto, allowed);
  }

  @Post('sync-from-sheet')
  syncFromSheet(
    @Body() body: { tenantId: string; categories: Array<{ id: string; players: Array<Record<string, unknown>> }> },
  ) {
    const { tenantId, categories } = body;
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId é obrigatório');
    }
    return this.service.syncFromSheet(tenantId.trim(), categories ?? []);
  }

  @Post('sync-from-sheet-all')
  syncFromSheetAll(
    @Body() body: { categories: Array<{ id: string; players: Array<Record<string, unknown>> }> },
  ) {
    const { categories } = body;
    return this.service.syncFromSheetAll(categories ?? []);
  }

  @Patch(':id')
  async update(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdatePlayerDto,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.update(id, dto, allowed);
  }

  @Delete(':id')
  async remove(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const allowed = await this.allowedTenants(req);
    return this.service.remove(id, allowed);
  }
}
