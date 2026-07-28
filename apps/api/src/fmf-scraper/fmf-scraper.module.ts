import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { MediaModule } from '../media/media.module';
import { ModulesModule } from '../modules/modules.module';
import { PagesModule } from '../pages/pages.module';
import { S3Module } from '../s3/s3.module';
import { FutebolAgendaModule } from '../futebol-agenda/futebol-agenda.module';
import { FmfScraperController } from './fmf-scraper.controller';
import { FmfPageSyncService } from './fmf-page-sync.service';
import { FmfScraperService } from './fmf-scraper.service';
import { FmfScraperSchedulerService } from './fmf-scraper-scheduler.service';
import { FmfTravelSyncService } from './fmf-travel-sync.service';
import { FmfVisitingTeamsSyncService } from './fmf-visiting-teams-sync.service';

@Module({
  imports: [
    AuthModule,
    ModulesModule,
    PagesModule,
    S3Module,
    MediaModule,
    forwardRef(() => FutebolAgendaModule),
  ],
  controllers: [FmfScraperController],
  providers: [
    FmfScraperService,
    FmfVisitingTeamsSyncService,
    FmfTravelSyncService,
    FmfPageSyncService,
    FmfScraperSchedulerService,
    ModuleAccessGuard,
  ],
  exports: [
    FmfScraperService,
    FmfPageSyncService,
    FmfVisitingTeamsSyncService,
    FmfTravelSyncService,
  ],
})
export class FmfScraperModule {}
