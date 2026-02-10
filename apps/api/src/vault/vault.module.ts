import { Module } from '@nestjs/common';
import { ModulesModule } from '../modules/modules.module';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { VaultEncryptionService } from './vault-encryption.service';
import { VaultService } from './vault.service';
import { VaultController } from './vault.controller';

@Module({
  imports: [ModulesModule],
  controllers: [VaultController],
  providers: [VaultEncryptionService, VaultService, ModuleAccessGuard],
  exports: [VaultService],
})
export class VaultModule {}
