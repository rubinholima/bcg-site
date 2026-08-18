import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { FutebolAgendaModule } from '../futebol-agenda/futebol-agenda.module';
import { SocialPedagogyCasesController } from './social-pedagogy-cases.controller';
import { SocialPedagogyCasesService } from './social-pedagogy-cases.service';
import { PlayerGuardiansController } from './player-guardians.controller';
import { PlayerGuardiansService } from './player-guardians.service';
import { PlayerSchoolEnrollmentsController } from './player-school-enrollments.controller';
import { PlayerSchoolEnrollmentsService } from './player-school-enrollments.service';
import { SocialPedagogyDocumentsController } from './social-pedagogy-documents.controller';
import { SocialPedagogyDocumentsService } from './social-pedagogy-documents.service';
import { SocialPedagogyReportsController } from './social-pedagogy-reports.controller';
import { SocialPedagogyReportsService } from './social-pedagogy-reports.service';

@Module({
  imports: [AuthModule, ModulesModule, FutebolAgendaModule],
  controllers: [
    SocialPedagogyCasesController,
    PlayerGuardiansController,
    PlayerSchoolEnrollmentsController,
    SocialPedagogyDocumentsController,
    SocialPedagogyReportsController,
  ],
  providers: [
    SocialPedagogyCasesService,
    PlayerGuardiansService,
    PlayerSchoolEnrollmentsService,
    SocialPedagogyDocumentsService,
    SocialPedagogyReportsService,
    ModuleAccessGuard,
  ],
  exports: [
    SocialPedagogyCasesService,
    PlayerGuardiansService,
    PlayerSchoolEnrollmentsService,
    SocialPedagogyDocumentsService,
    SocialPedagogyReportsService,
  ],
})
export class AssistenciaSocialModule {}
