import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { TenantsModule } from '../tenants/tenants.module';
import { FmfScraperModule } from '../fmf-scraper/fmf-scraper.module';
import {
  FutebolAgendaController,
  FootballActivitySpacesController,
} from './futebol-agenda.controller';
import { FutebolAgendaService } from './futebol-agenda.service';
import { FootballActivitySpacesService } from './football-activity-spaces.service';
import { FootballAgendaBirthdaysService } from './football-agenda-birthdays.service';
import { FmfAgendaSyncService } from './fmf-agenda-sync.service';
import { ModuleAccessGuard } from '../auth/module-access.guard';

@Module({
  imports: [AuthModule, ModulesModule, TenantsModule, forwardRef(() => FmfScraperModule)],
  controllers: [FutebolAgendaController, FootballActivitySpacesController],
  providers: [
    FutebolAgendaService,
    FootballActivitySpacesService,
    FootballAgendaBirthdaysService,
    FmfAgendaSyncService,
    ModuleAccessGuard,
  ],
  exports: [
    FutebolAgendaService,
    FootballActivitySpacesService,
    FootballAgendaBirthdaysService,
    FmfAgendaSyncService,
  ],
})
export class FutebolAgendaModule {}
