import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { Cup360AccessAdminGuard } from '../auth/cup360-access-admin.guard';
import { AccessAdminController } from './access-admin.controller';
import { ModulesController } from './modules.controller';
import { AccessAdminUsersService } from './access-admin-users.service';
import { EffectiveAccessService } from './effective-access.service';
import { ModuleCatalogBootstrapService } from './module-catalog.bootstrap.service';
import { ModulesService } from './modules.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [ModulesController, AccessAdminController],
  providers: [
    ModulesService,
    AccessAdminUsersService,
    EffectiveAccessService,
    ModuleCatalogBootstrapService,
    Cup360AccessAdminGuard,
  ],
  exports: [ModulesService, EffectiveAccessService],
})
export class ModulesModule {}
