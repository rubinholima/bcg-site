import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkMailService } from './workmail.service';
import { WorkmailController } from './workmail.controller';

@Module({
  imports: [PrismaModule],
  controllers: [WorkmailController],
  providers: [WorkMailService],
  exports: [WorkMailService],
})
export class WorkmailModule {}
