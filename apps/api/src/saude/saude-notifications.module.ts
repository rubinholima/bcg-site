import { Module } from '@nestjs/common';
import { MailService } from '../common/mail.service';
import { PrismaModule } from '../prisma/prisma.module';
import { HealthAttendanceFisiologiaNotifyService } from './health-attendance-fisiologia-notify.service';

@Module({
  imports: [PrismaModule],
  providers: [HealthAttendanceFisiologiaNotifyService, MailService],
  exports: [HealthAttendanceFisiologiaNotifyService],
})
export class SaudeNotificationsModule {}
