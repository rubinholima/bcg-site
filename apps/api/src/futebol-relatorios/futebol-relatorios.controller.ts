import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { FutebolRelatoriosService } from './futebol-relatorios.service';
import { GuiaPartidaService } from './guia-partida.service';
import { FmfMatchReportService } from '../fmf-scraper/fmf-match-report.service';
import type { PressKitConfigDto } from './futebol-relatorios.types';

@Controller('futebol-relatorios')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('relatorios_futebol')
export class FutebolRelatoriosController {
  constructor(
    private readonly service: FutebolRelatoriosService,
    private readonly guiaPartida: GuiaPartidaService,
    private readonly fmfMatchReports: FmfMatchReportService,
  ) {}

  @Get('viagens')
  listViagens(@Query('tenantId') tenantId?: string) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId é obrigatório');
    }
    return this.service.listTravels(tenantId.trim());
  }

  @Get('passageiros')
  getPassageiros(@Query('travelId') travelId?: string) {
    if (!travelId?.trim()) {
      throw new BadRequestException('travelId é obrigatório');
    }
    return this.service.getPassageiros(travelId.trim());
  }

  @Get('hospedes')
  getHospedes(@Query('travelId') travelId?: string) {
    if (!travelId?.trim()) {
      throw new BadRequestException('travelId é obrigatório');
    }
    return this.service.getHospedes(travelId.trim());
  }

  @Get('layout-relacionados')
  getLayoutRelacionados(@Query('travelId') travelId?: string) {
    if (!travelId?.trim()) {
      throw new BadRequestException('travelId é obrigatório');
    }
    return this.service.getLayoutRelacionados(travelId.trim());
  }

  @Get('press-kit')
  getPressKit(@Query('travelId') travelId?: string) {
    if (!travelId?.trim()) {
      throw new BadRequestException('travelId é obrigatório');
    }
    return this.service.getPressKit(travelId.trim());
  }

  @Put('press-kit')
  savePressKit(
    @Query('travelId') travelId?: string,
    @Body() body?: Partial<PressKitConfigDto>,
  ) {
    if (!travelId?.trim()) {
      throw new BadRequestException('travelId é obrigatório');
    }
    return this.service.savePressKit(travelId.trim(), body ?? {});
  }

  @Get('guia-partida')
  getGuiaPartida(@Query('travelId') travelId?: string) {
    if (!travelId?.trim()) {
      throw new BadRequestException('travelId é obrigatório');
    }
    return this.guiaPartida.getGuiaPartida(travelId.trim());
  }

  @Get('sumulas')
  listSumulas(
    @Query('tenantId') tenantId?: string,
    @Query('category') category?: string,
    @Query('season') season?: string,
  ) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId é obrigatório');
    }
    const seasonNum = season?.trim() ? Number(season.trim()) : undefined;
    return this.service.listSumulaMatches({
      tenantId: tenantId.trim(),
      category: category?.trim() || undefined,
      season: Number.isFinite(seasonNum) ? seasonNum : undefined,
    });
  }

  @Get('sumula-cartoes')
  getSumulaCartoes(
    @Query('tenantId') tenantId?: string,
    @Query('matchId') matchId?: string,
    @Query('category') category?: string,
    @Query('season') season?: string,
  ) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId é obrigatório');
    }
    const seasonNum = season?.trim() ? Number(season.trim()) : undefined;
    return this.service.getSumulaCartoesReport({
      tenantId: tenantId.trim(),
      matchId: matchId?.trim() || undefined,
      category: category?.trim() || undefined,
      season: Number.isFinite(seasonNum) ? seasonNum : undefined,
    });
  }

  @Get('discipline-competitions')
  listDisciplineCompetitions(
    @Query('tenantId') tenantId?: string,
    @Query('season') season?: string,
  ) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId é obrigatório');
    }
    const seasonNum = season?.trim() ? Number(season.trim()) : undefined;
    return this.service.listDisciplineCompetitions({
      tenantId: tenantId.trim(),
      season: Number.isFinite(seasonNum) ? seasonNum : undefined,
    });
  }

  @Get('discipline-phases')
  listDisciplinePhases(
    @Query('tenantId') tenantId?: string,
    @Query('competition') competition?: string,
    @Query('category') category?: string,
    @Query('season') season?: string,
  ) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId é obrigatório');
    }
    if (!competition?.trim() && !category?.trim()) {
      throw new BadRequestException('competition ou category é obrigatório');
    }
    const seasonNum = season?.trim() ? Number(season.trim()) : undefined;
    return this.service.listDisciplinePhases({
      tenantId: tenantId.trim(),
      competition: competition?.trim() || undefined,
      category: category?.trim() || undefined,
      season: Number.isFinite(seasonNum) ? seasonNum : undefined,
    });
  }

  @Get('fmf-cadastro-pendencies')
  listFmfCadastroPendencies(@Query('tenantId') tenantId?: string) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId é obrigatório');
    }
    return this.fmfMatchReports.listCadastroPendencies(tenantId.trim());
  }

  @Post('fmf-cadastro-pendencies/link')
  linkFmfCadastroPendency(
    @Body()
    body: {
      tenantId?: string;
      playerId?: string;
      cbfRegistration?: string;
      sourceName?: string;
    },
  ) {
    if (!body?.tenantId?.trim()) {
      throw new BadRequestException('tenantId é obrigatório');
    }
    if (!body?.playerId?.trim()) {
      throw new BadRequestException('playerId é obrigatório');
    }
    if (!body?.sourceName?.trim() && !body?.cbfRegistration?.trim()) {
      throw new BadRequestException('sourceName ou cbfRegistration é obrigatório');
    }
    return this.fmfMatchReports.linkUnresolvedToPlayer({
      tenantId: body.tenantId.trim(),
      playerId: body.playerId.trim(),
      cbfRegistration: body.cbfRegistration?.trim(),
      sourceName: body.sourceName?.trim() ?? '',
    });
  }

  @Get('cartoes-suspensao')
  getCartoesSuspensao(
    @Query('tenantId') tenantId?: string,
    @Query('competition') competition?: string,
    @Query('category') category?: string,
    @Query('season') season?: string,
    @Query('nextMatchDate') nextMatchDate?: string,
    @Query('phase') phase?: string,
  ) {
    if (!tenantId?.trim()) {
      throw new BadRequestException('tenantId é obrigatório');
    }
    if (!competition?.trim() && !category?.trim()) {
      throw new BadRequestException('competition ou category é obrigatório');
    }
    const seasonNum = season?.trim() ? Number(season.trim()) : undefined;
    return this.service.getCartoesSuspensaoReport({
      tenantId: tenantId.trim(),
      competition: competition?.trim() || undefined,
      category: category?.trim() || undefined,
      season: Number.isFinite(seasonNum) ? seasonNum : undefined,
      nextMatchDate: nextMatchDate?.trim() || undefined,
      phase: phase?.trim() || undefined,
    });
  }

  @Get('programacao-semanal')
  getProgramacaoSemanal(
    @Query('tenantId') tenantId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('categories') categories?: string,
    @Query('excludeTypes') excludeTypes?: string,
  ) {
    if (!tenantId?.trim() || !from?.trim() || !to?.trim()) {
      throw new BadRequestException('tenantId, from e to são obrigatórios');
    }
    return this.service.getProgramacaoSemanal({
      tenantId: tenantId.trim(),
      from: from.trim(),
      to: to.trim(),
      categories,
      excludeTypes,
    });
  }
}
