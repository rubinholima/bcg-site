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
  providers: [FmfScraperService, FmfPageSyncService, FmfScraperSchedulerService, ModuleAccessGuard],
  exports: [FmfScraperService, FmfPageSyncService],
})
export class FmfScraperModule {}
