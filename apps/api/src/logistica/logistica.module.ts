import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { TenantsModule } from '../tenants/tenants.module';
import { LogisticaController } from './logistica.controller';
import { LogisticaService } from './logistica.service';
import { LogisticaCadastrosController } from '../logistica-cadastros/logistica-cadastros.controller';
import { LogisticaCadastrosService } from '../logistica-cadastros/logistica-cadastros.service';
import { ModuleAccessGuard } from '../auth/module-access.guard';

@Module({
  imports: [AuthModule, ModulesModule, TenantsModule],
  controllers: [LogisticaController, LogisticaCadastrosController],
  providers: [LogisticaService, LogisticaCadastrosService, ModuleAccessGuard],
  exports: [LogisticaService, LogisticaCadastrosService],
})
export class LogisticaModule {}
