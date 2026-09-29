import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { ModulesModule } from '../modules/modules.module';
import { FinanceiroModule } from '../financeiro/financeiro.module';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import { PlayerNegotiationIntegrationService } from './player-negotiation-integration.service';
import { PlayerNegotiationsController } from './player-negotiations.controller';
import { PlayerNegotiationsService } from './player-negotiations.service';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule, FinanceiroModule, S3Module],
  controllers: [PlayerNegotiationsController],
  providers: [
    ModuleAccessGuard,
    PlayerNegotiationsService,
    PlayerNegotiationIntegrationService,
  ],
  exports: [PlayerNegotiationsService],
})
export class PlayerNegotiationsModule {}
