import { Module } from '@nestjs/common';
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

@Module({
  imports: [PrismaModule, GroupModule, HomeContentModule, PagesModule, S3Module, WorkmailModule, EventsModule],
  controllers: [PublicController],
  providers: [PublicService, SofaScoreService],
})
export class PublicModule {}
