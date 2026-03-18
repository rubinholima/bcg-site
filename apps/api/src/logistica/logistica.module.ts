import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { TenantsModule } from '../tenants/tenants.module';
import { LogisticaController } from './logistica.controller';
import { LogisticaService } from './logistica.service';
import { ModuleAccessGuard } from '../auth/module-access.guard';

@Module({
  imports: [AuthModule, ModulesModule, TenantsModule],
  controllers: [LogisticaController],
  providers: [LogisticaService, ModuleAccessGuard],
  exports: [LogisticaService],
})
export class LogisticaModule {}
