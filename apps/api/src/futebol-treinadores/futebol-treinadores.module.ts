import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { FutebolRelatoriosModule } from '../futebol-relatorios/futebol-relatorios.module';
import { CoachMatchStatsModule } from '../coach-match-stats/coach-match-stats.module';
import { FutebolTreinadoresController } from './futebol-treinadores.controller';
import { FutebolTreinadoresService } from './futebol-treinadores.service';
import { ModuleAccessGuard } from '../auth/module-access.guard';

@Module({
  imports: [AuthModule, ModulesModule, FutebolRelatoriosModule, CoachMatchStatsModule],
  controllers: [FutebolTreinadoresController],
  providers: [FutebolTreinadoresService, ModuleAccessGuard],
})
export class FutebolTreinadoresModule {}
