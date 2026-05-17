import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TenantsModule } from '../tenants/tenants.module';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { OmieService } from './omie/omie.service';
import { MetaOAuthController } from './meta/meta-oauth.controller';
import { MetaOAuthService } from './meta/meta-oauth.service';
import { ModulesModule } from '../modules/modules.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';

@Module({
  imports: [forwardRef(() => AuthModule), TenantsModule, PrismaModule, ModulesModule],
  controllers: [IntegrationsController, MetaOAuthController],
  providers: [
    IntegrationsService,
    OmieService,
    MetaOAuthService,
    DashboardRolesGuard,
    ModuleAccessGuard,
    SuperAdminGuard,
  ],
  exports: [IntegrationsService, OmieService, MetaOAuthService],
})
export class IntegrationsModule {}
