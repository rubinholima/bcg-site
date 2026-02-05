import { Module } from '@nestjs/common';
import { GroupModule } from '../group/group.module';
import { HomeContentModule } from '../home-content/home-content.module';
import { PagesModule } from '../pages/pages.module';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import { WorkmailModule } from '../workmail/workmail.module';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [PrismaModule, GroupModule, HomeContentModule, PagesModule, S3Module, WorkmailModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
