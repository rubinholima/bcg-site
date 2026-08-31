import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { FisioterapiaModule } from '../fisioterapia/fisioterapia.module';
import { FisiologiaController } from './fisiologia.controller';
import { FisiologiaService } from './fisiologia.service';
import { FisiologiaReportsService } from './fisiologia-reports.service';
import { FisiologiaTransitionService } from './fisiologia-transition.service';
@Module({
  imports: [PrismaModule, AuthModule, ModulesModule, FisioterapiaModule],
  controllers: [FisiologiaController],
  providers: [FisiologiaService, FisiologiaReportsService, FisiologiaTransitionService],
  exports: [FisiologiaService],
})
export class FisiologiaModule {}
