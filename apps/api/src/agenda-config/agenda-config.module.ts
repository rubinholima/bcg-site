import { Module } from '@nestjs/common';
import { AgendaConfigController } from './agenda-config.controller';
import { AgendaConfigService } from './agenda-config.service';
import { ModulesModule } from '../modules/modules.module';

@Module({
  imports: [ModulesModule],
  controllers: [AgendaConfigController],
  providers: [AgendaConfigService],
  exports: [AgendaConfigService],
})
export class AgendaConfigModule {}
