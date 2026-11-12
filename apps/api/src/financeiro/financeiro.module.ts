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
import { FinanceSettlementService } from './finance-settlement.service';
import { FinanceAllocationService } from './finance-allocation.service';
import { FinanceInstallmentService } from './finance-installment.service';
import { FinanceTransferService } from './finance-transfer.service';
import { FinanceDocumentService } from './finance-document.service';
import { FinanceReconciliationService } from './finance-reconciliation.service';
import { FinanceCardStatementService } from './finance-card-statement.service';
import { FinancePayrollDeductionService } from './finance-payroll-deduction.service';
import { FinancePhase2Controller } from './finance-phase2.controller';
import { FinanceReportController } from './finance-report.controller';
import { FinanceReportService } from './finance-report.service';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [AuthModule, ModulesModule, IntegrationsModule, S3Module],
  controllers: [
    FinanceiroOmieController,
    FinanceiroLancamentosController,
    FinanceCatalogController,
    FinancePhase2Controller,
    FinanceReportController,
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
    FinanceSettlementService,
    FinanceAllocationService,
    FinanceInstallmentService,
    FinanceTransferService,
    FinanceDocumentService,
    FinanceReconciliationService,
    FinanceCardStatementService,
    FinancePayrollDeductionService,
    FinanceReportService,
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
