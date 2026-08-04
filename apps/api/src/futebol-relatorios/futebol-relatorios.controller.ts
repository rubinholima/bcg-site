import {
  Body,
  Controller,
  Get,
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
import type { PressKitConfigDto } from './futebol-relatorios.types';

@Controller('futebol-relatorios')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('relatorios_futebol')
export class FutebolRelatoriosController {
  constructor(private readonly service: FutebolRelatoriosService) {}

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

  @Get('programacao-semanal')
  getProgramacaoSemanal(
    @Query('tenantId') tenantId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('categories') categories?: string,
  ) {
    if (!tenantId?.trim() || !from?.trim() || !to?.trim()) {
      throw new BadRequestException('tenantId, from e to são obrigatórios');
    }
    return this.service.getProgramacaoSemanal({
      tenantId: tenantId.trim(),
      from: from.trim(),
      to: to.trim(),
      categories,
    });
  }
}
