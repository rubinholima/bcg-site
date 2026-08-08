import { Module } from '@nestjs/common';
import { BostonTvInstallGuard } from '../auth/boston-tv-install.guard';
import { GroupModule } from '../group/group.module';
import { HomeContentModule } from '../home-content/home-content.module';
import { PagesModule } from '../pages/pages.module';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import { WorkmailModule } from '../workmail/workmail.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { SofaScoreService } from './sofascore.service';
import { EventsModule } from '../events/events.module';
import { MediaModule } from '../media/media.module';
import { BostonTvModule } from '../boston-tv/boston-tv.module';
import { RegistrationInviteModule } from '../registration-invite/registration-invite.module';
import { BostonCityHallModule } from '../boston-city-hall/boston-city-hall.module';
import { TenantPressModule } from '../tenant-press/tenant-press.module';
import { FmfScraperModule } from '../fmf-scraper/fmf-scraper.module';
import { CadastrosModule } from '../cadastros/cadastros.module';

@Module({
  imports: [
    PrismaModule,
    GroupModule,
    HomeContentModule,
    PagesModule,
    S3Module,
    MediaModule,
    WorkmailModule,
    EventsModule,
    BostonTvModule,
    RegistrationInviteModule,
    BostonCityHallModule,
    TenantPressModule,
    FmfScraperModule,
    CadastrosModule,
  ],
  controllers: [PublicController],
  providers: [PublicService, SofaScoreService, BostonTvInstallGuard],
})
export class PublicModule {}
