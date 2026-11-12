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
import { FinanceCatalogController } from './finance-catalog.controller';
import { FinanceAccountsService } from './finance-accounts.service';
import { FinanceCategoriesService } from './finance-categories.service';
import { FinancePaymentMethodsService } from './finance-payment-methods.service';
import { SupplierPaymentDestinationsService } from './supplier-payment-destinations.service';
import { FinanceAccessService } from './finance-access.service';
import { FinanceCapabilityGuard } from './finance-capability.guard';
import { FinanceAuditService } from './finance-audit.service';
import { FinanceDelegationService } from './finance-delegation.service';

@Module({
  imports: [AuthModule, ModulesModule, IntegrationsModule],
  controllers: [
    FinanceiroOmieController,
    FinanceiroLancamentosController,
    FinanceCatalogController,
    CustomersController,
  ],
  providers: [
    ModuleAccessGuard,
    FinanceCapabilityGuard,
    FinanceiroLancamentosService,
    CustomersService,
    FinanceAccountsService,
    FinanceCategoriesService,
    FinancePaymentMethodsService,
    SupplierPaymentDestinationsService,
    FinanceAccessService,
    FinanceAuditService,
    FinanceDelegationService,
  ],
  exports: [
    CustomersService,
    FinanceiroLancamentosService,
    FinanceAuditService,
    FinanceDelegationService,
    FinanceAccessService,
  ],
})
export class FinanceiroModule {}
