import { Module } from '@nestjs/common';
import { PsychologySessionsController } from './psychology-sessions.controller';
import { PsychologySessionsService } from './psychology-sessions.service';
import { FutebolAgendaModule } from '../futebol-agenda/futebol-agenda.module';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ModuleAccessGuard } from '../auth/module-access.guard';

@Module({
  imports: [PrismaModule, FutebolAgendaModule, AuthModule, ModulesModule],
  controllers: [PsychologySessionsController],
  providers: [PsychologySessionsService, ModuleAccessGuard],
  exports: [PsychologySessionsService],
})
export class PsychologySessionsModule {}
