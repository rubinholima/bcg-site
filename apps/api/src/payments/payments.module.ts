import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { VaultModule } from '../vault/vault.module';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { PaymentsController } from './payments.controller';
import { PaymentCoreService } from './payment-core.service';
import { PaymentProviderAccountsService } from './payment-provider-accounts.service';

@Module({
  imports: [AuthModule, ModulesModule, VaultModule],
  controllers: [PaymentsController],
  providers: [ModuleAccessGuard, PaymentCoreService, PaymentProviderAccountsService],
  exports: [PaymentCoreService, PaymentProviderAccountsService],
})
export class PaymentsModule {}
