import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AgendaConfigController } from './agenda-config.controller';
import { AgendaConfigService } from './agenda-config.service';
import { ModulesModule } from '../modules/modules.module';

@Module({
  imports: [AuthModule, ModulesModule],
  controllers: [AgendaConfigController],
  providers: [AgendaConfigService],
  exports: [AgendaConfigService],
})
export class AgendaConfigModule {}
