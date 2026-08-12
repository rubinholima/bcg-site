import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { FutebolAgendaModule } from '../futebol-agenda/futebol-agenda.module';
import { FutebolRelatoriosController } from './futebol-relatorios.controller';
import { FutebolRelatoriosService } from './futebol-relatorios.service';
import { GuiaPartidaService } from './guia-partida.service';
import { ModuleAccessGuard } from '../auth/module-access.guard';

@Module({
  imports: [AuthModule, ModulesModule, FutebolAgendaModule],
  controllers: [FutebolRelatoriosController],
  providers: [FutebolRelatoriosService, GuiaPartidaService, ModuleAccessGuard],
  exports: [GuiaPartidaService, FutebolRelatoriosService],
})
export class FutebolRelatoriosModule {}
