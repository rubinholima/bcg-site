import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { CaptacaoModule } from '../captacao/captacao.module';
import { SeasonHighlightsController } from './season-highlights.controller';
import { SeasonHighlightsService } from './season-highlights.service';
import { OpponentRadarService } from './opponent-radar.service';
import { ModuleAccessGuard } from '../auth/module-access.guard';

@Module({
  imports: [AuthModule, ModulesModule, CaptacaoModule],
  controllers: [SeasonHighlightsController],
  providers: [SeasonHighlightsService, OpponentRadarService, ModuleAccessGuard],
  exports: [SeasonHighlightsService, OpponentRadarService],
})
export class SeasonHighlightsModule {}
