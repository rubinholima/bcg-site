import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { VaultModule } from '../vault/vault.module';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { InfrastructureController } from './infrastructure.controller';
import { InfrastructureService } from './infrastructure.service';

@Module({
  imports: [AuthModule, ModulesModule, VaultModule],
  controllers: [InfrastructureController],
  providers: [InfrastructureService, ModuleAccessGuard],
  exports: [InfrastructureService],
})
export class InfrastructureModule {}
