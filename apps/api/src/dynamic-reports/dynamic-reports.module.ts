import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { DynamicReportsController } from './dynamic-reports.controller';
import { DynamicReportsService } from './dynamic-reports.service';

@Module({
  imports: [AuthModule, ModulesModule],
  controllers: [DynamicReportsController],
  providers: [DynamicReportsService, ModuleAccessGuard],
})
export class DynamicReportsModule {}
