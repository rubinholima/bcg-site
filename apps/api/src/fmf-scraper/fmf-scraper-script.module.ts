import { Module, forwardRef } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { PagesModule } from '../pages/pages.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesModule } from '../roles/roles.module';
import { S3Module } from '../s3/s3.module';
import { FutebolAgendaModule } from '../futebol-agenda/futebol-agenda.module';
import { FmfPageSyncService } from './fmf-page-sync.service';
import { FmfMatchReportService } from './fmf-match-report.service';
import { FmfScraperService } from './fmf-scraper.service';
import { FmfTravelSyncService } from './fmf-travel-sync.service';
import { FmfVisitingTeamsSyncService } from './fmf-visiting-teams-sync.service';

/** Contexto mínimo para scripts CLI (sem controller/guards). */
@Module({
  imports: [
    PrismaModule,
    RolesModule,
    PagesModule,
    S3Module,
    MediaModule,
    forwardRef(() => FutebolAgendaModule),
  ],
  providers: [
    FmfScraperService,
    FmfVisitingTeamsSyncService,
    FmfTravelSyncService,
    FmfPageSyncService,
    FmfMatchReportService,
  ],
  exports: [
    FmfScraperService,
    FmfVisitingTeamsSyncService,
    FmfTravelSyncService,
    FmfPageSyncService,
    FmfMatchReportService,
  ],
})
export class FmfScraperScriptModule {}
