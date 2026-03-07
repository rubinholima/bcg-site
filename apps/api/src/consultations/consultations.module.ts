import { Module } from '@nestjs/common';
import { ConsultationsController } from './consultations.controller';
import { ConsultationsService } from './consultations.service';
import { ConsultationNotifyService } from './consultation-notify.service';
import { GoogleCalendarService } from './google-calendar.service';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule],
  controllers: [ConsultationsController],
  providers: [ConsultationsService, GoogleCalendarService, ConsultationNotifyService],
  exports: [ConsultationsService],
})
export class ConsultationsModule {}
