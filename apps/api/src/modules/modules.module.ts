import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AccessAdminController } from './access-admin.controller';
import { ModulesController } from './modules.controller';
import { EffectiveAccessService } from './effective-access.service';
import { ModuleCatalogBootstrapService } from './module-catalog.bootstrap.service';
import { ModulesService } from './modules.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [ModulesController, AccessAdminController],
  providers: [ModulesService, EffectiveAccessService, ModuleCatalogBootstrapService],
  exports: [ModulesService, EffectiveAccessService],
})
export class ModulesModule {}
