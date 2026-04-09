import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { VaultEncryptionService } from './vault-encryption.service';
import { VaultService } from './vault.service';
import { VaultController } from './vault.controller';

@Module({
  imports: [AuthModule, ModulesModule],
  controllers: [VaultController],
  providers: [VaultEncryptionService, VaultService, ModuleAccessGuard],
  exports: [VaultService, VaultEncryptionService],
})
export class VaultModule {}
