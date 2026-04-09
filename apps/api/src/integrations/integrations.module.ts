import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TenantsModule } from '../tenants/tenants.module';
import { IntegrationsController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { OmieService } from './omie/omie.service';

@Module({
  imports: [forwardRef(() => AuthModule), TenantsModule],
  controllers: [IntegrationsController],
  providers: [IntegrationsService, OmieService],
  exports: [IntegrationsService, OmieService],
})
export class IntegrationsModule {}
