import { Module } from '@nestjs/common';
import { PerformanceAnalysisController } from './performance-analysis.controller';
import { PerformanceAnalysisService } from './performance-analysis.service';
import { PerformanceAnalysisAccessService } from './performance-analysis-access.service';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { AuthModule } from '../auth/auth.module';
import { S3Module } from '../s3/s3.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ModulesModule } from '../modules/modules.module';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule, S3Module],
  controllers: [PerformanceAnalysisController],
  providers: [PerformanceAnalysisService, PerformanceAnalysisAccessService, ModuleAccessGuard],
  exports: [PerformanceAnalysisService],
})
export class PerformanceAnalysisModule {}
