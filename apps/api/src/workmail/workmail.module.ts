import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkMailService } from './workmail.service';
import { WorkMailInboxService } from './workmail-inbox.service';
import { WorkmailController } from './workmail.controller';

@Module({
  imports: [PrismaModule],
  controllers: [WorkmailController],
  providers: [WorkMailService, WorkMailInboxService],
  exports: [WorkMailService, WorkMailInboxService],
})
export class WorkmailModule {}
