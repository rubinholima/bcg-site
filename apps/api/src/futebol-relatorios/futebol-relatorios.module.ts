import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { FutebolAgendaModule } from '../futebol-agenda/futebol-agenda.module';
import { FutebolRelatoriosController } from './futebol-relatorios.controller';
import { FutebolRelatoriosService } from './futebol-relatorios.service';
import { ModuleAccessGuard } from '../auth/module-access.guard';

@Module({
  imports: [AuthModule, ModulesModule, FutebolAgendaModule],
  controllers: [FutebolRelatoriosController],
  providers: [FutebolRelatoriosService, ModuleAccessGuard],
})
export class FutebolRelatoriosModule {}
