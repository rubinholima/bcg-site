import { Controller, Get, UseGuards } from '@nestjs/common';
import { DiretoriaService } from './diretoria.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';

@Controller('diretoria')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
@UseGuards(ModuleAccessGuard)
@RequireModule('diretoria')
export class DiretoriaController {
  constructor(private readonly service: DiretoriaService) {}

  @Get('dashboard')
  getDashboard() {
    return this.service.getDashboard();
  }

  /** Consolidação por empresa: títulos em aberto e pedidos de compra do mês — pode levar vários segundos. */
  @Get('omie-financeiro')
  getOmieFinanceiro() {
    return this.service.getOmieFinanceiro();
  }
}
