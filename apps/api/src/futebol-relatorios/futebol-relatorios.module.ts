import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { FutebolAgendaModule } from '../futebol-agenda/futebol-agenda.module';
import { FmfScraperModule } from '../fmf-scraper/fmf-scraper.module';
import { FutebolRelatoriosController } from './futebol-relatorios.controller';
import { FutebolRelatoriosService } from './futebol-relatorios.service';
import { GuiaPartidaService } from './guia-partida.service';
import { PersonalDisciplineHistoryService } from './personal-discipline-history.service';
import { ModuleAccessGuard } from '../auth/module-access.guard';

@Module({
  imports: [AuthModule, ModulesModule, FutebolAgendaModule, FmfScraperModule],
  controllers: [FutebolRelatoriosController],
  providers: [
    FutebolRelatoriosService,
    GuiaPartidaService,
    PersonalDisciplineHistoryService,
    ModuleAccessGuard,
  ],
  exports: [GuiaPartidaService, FutebolRelatoriosService, PersonalDisciplineHistoryService],
})
export class FutebolRelatoriosModule {}
