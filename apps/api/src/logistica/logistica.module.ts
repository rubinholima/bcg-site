import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { TenantsModule } from '../tenants/tenants.module';
import { LogisticaController } from './logistica.controller';
import { LogisticaService } from './logistica.service';
import { LogisticaCadastrosController } from '../logistica-cadastros/logistica-cadastros.controller';
import { LogisticaCadastrosService } from '../logistica-cadastros/logistica-cadastros.service';
import { LogisticsUniformKitsController } from '../logistica-cadastros/logistics-uniform-kits.controller';
import { LogisticsUniformKitsService } from '../logistica-cadastros/logistics-uniform-kits.service';
import { ModuleAccessGuard } from '../auth/module-access.guard';

@Module({
  imports: [AuthModule, ModulesModule, TenantsModule],
  controllers: [
    LogisticaController,
    LogisticaCadastrosController,
    LogisticsUniformKitsController,
  ],
  providers: [
    LogisticaService,
    LogisticaCadastrosService,
    LogisticsUniformKitsService,
    ModuleAccessGuard,
  ],
  exports: [LogisticaService, LogisticaCadastrosService, LogisticsUniformKitsService],
})
export class LogisticaModule {}
