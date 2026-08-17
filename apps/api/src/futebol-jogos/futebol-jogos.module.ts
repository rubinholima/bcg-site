import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { FutebolRelatoriosModule } from '../futebol-relatorios/futebol-relatorios.module';
import { CoachMatchStatsModule } from '../coach-match-stats/coach-match-stats.module';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { FutebolJogosController } from './futebol-jogos.controller';
import { FutebolJogosService } from './futebol-jogos.service';

@Module({
  imports: [AuthModule, ModulesModule, FutebolRelatoriosModule, CoachMatchStatsModule],
  controllers: [FutebolJogosController],
  providers: [FutebolJogosService, ModuleAccessGuard],
})
export class FutebolJogosModule {}
