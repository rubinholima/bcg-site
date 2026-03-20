import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ModulesModule } from '../modules/modules.module';
import { HomeContentModule } from '../home-content/home-content.module';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule, HomeContentModule, S3Module],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
