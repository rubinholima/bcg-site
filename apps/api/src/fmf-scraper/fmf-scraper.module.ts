import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { PagesModule } from '../pages/pages.module';
import { S3Module } from '../s3/s3.module';
import { FmfScraperController } from './fmf-scraper.controller';
import { FmfPageSyncService } from './fmf-page-sync.service';
import { FmfScraperService } from './fmf-scraper.service';
import { FmfScraperSchedulerService } from './fmf-scraper-scheduler.service';

@Module({
  imports: [PagesModule, S3Module, MediaModule],
  controllers: [FmfScraperController],
  providers: [FmfScraperService, FmfPageSyncService, FmfScraperSchedulerService],
  exports: [FmfScraperService, FmfPageSyncService],
})
export class FmfScraperModule {}
