import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { FinanceiroOmieController } from './financeiro-omie.controller';
import { FinanceiroLancamentosController } from './financeiro-lancamentos.controller';
import { FinanceiroLancamentosService } from './financeiro-lancamentos.service';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

@Module({
  imports: [AuthModule, ModulesModule, IntegrationsModule],
  controllers: [FinanceiroOmieController, FinanceiroLancamentosController, CustomersController],
  providers: [ModuleAccessGuard, FinanceiroLancamentosService, CustomersService],
  exports: [CustomersService],
})
export class FinanceiroModule {}
