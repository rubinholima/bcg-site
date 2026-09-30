import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AccessAdminController } from './access-admin.controller';
import { ModulesController } from './modules.controller';
import { EffectiveAccessService } from './effective-access.service';
import { ModulesService } from './modules.service';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [ModulesController, AccessAdminController],
  providers: [ModulesService, EffectiveAccessService],
  exports: [ModulesService, EffectiveAccessService],
})
export class ModulesModule {}
