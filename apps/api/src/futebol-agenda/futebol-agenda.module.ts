import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { TenantsModule } from '../tenants/tenants.module';
import { FutebolAgendaController } from './futebol-agenda.controller';
import { FutebolAgendaService } from './futebol-agenda.service';
import { ModuleAccessGuard } from '../auth/module-access.guard';

@Module({
  imports: [AuthModule, ModulesModule, TenantsModule],
  controllers: [FutebolAgendaController],
  providers: [FutebolAgendaService, ModuleAccessGuard],
  exports: [FutebolAgendaService],
})
export class FutebolAgendaModule {}
