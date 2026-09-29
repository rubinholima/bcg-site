import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FisioterapiaModule } from '../fisioterapia/fisioterapia.module';
import { TryoutWorkflowModule } from '../tryout-workflow/tryout-workflow.module';
import { PlayerNegotiationsModule } from '../player-negotiations/player-negotiations.module';
import { TenantsModule } from '../tenants/tenants.module';
import { FutebolExecutiveController } from './futebol-executive.controller';
import { FutebolExecutiveService } from './futebol-executive.service';
import { SeasonHighlightsModule } from '../season-highlights/season-highlights.module';
import { PrepFisicaModule } from '../prep-fisica/prep-fisica.module';
import { TreinadorGoleirosModule } from '../treinador-goleiros/treinador-goleiros.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ModulesModule,
    FisioterapiaModule,
    TryoutWorkflowModule,
    PlayerNegotiationsModule,
    TenantsModule,
    SeasonHighlightsModule,
    PrepFisicaModule,
    TreinadorGoleirosModule,
  ],
  controllers: [FutebolExecutiveController],
  providers: [FutebolExecutiveService],
})
export class FutebolExecutiveModule {}
