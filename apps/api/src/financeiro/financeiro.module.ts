import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { FinanceiroOmieController } from './financeiro-omie.controller';

@Module({
  imports: [AuthModule, ModulesModule, IntegrationsModule],
  controllers: [FinanceiroOmieController],
  providers: [ModuleAccessGuard],
})
export class FinanceiroModule {}
