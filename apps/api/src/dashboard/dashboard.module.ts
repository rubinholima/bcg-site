import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkmailModule } from '../workmail/workmail.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [PrismaModule, WorkmailModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
