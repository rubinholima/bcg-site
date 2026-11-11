import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import { FinanceiroModule } from '../financeiro/financeiro.module';
import { AthleteContractsController } from './athlete-contracts.controller';
import { AthleteContractsService } from './athlete-contracts.service';
import { AthleteContractNotificationService } from './athlete-contract-notification.service';
import { AthleteContractPdfService } from './athlete-contract-pdf.service';

@Module({
  imports: [AuthModule, ModulesModule, PrismaModule, S3Module, FinanceiroModule],
  controllers: [AthleteContractsController],
  providers: [AthleteContractsService, AthleteContractNotificationService, AthleteContractPdfService],
  exports: [AthleteContractsService],
})
export class AthleteContractsModule {}
