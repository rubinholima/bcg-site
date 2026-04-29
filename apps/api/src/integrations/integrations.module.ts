import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TenantsModule } from '../tenants/tenants.module';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { OmieService } from './omie/omie.service';
import { MetaOAuthController } from './meta/meta-oauth.controller';
import { MetaOAuthService } from './meta/meta-oauth.service';

@Module({
  imports: [forwardRef(() => AuthModule), TenantsModule],
  controllers: [IntegrationsController, MetaOAuthController],
  providers: [IntegrationsService, OmieService, MetaOAuthService],
  exports: [IntegrationsService, OmieService],
})
export class IntegrationsModule {}
