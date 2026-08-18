import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { FisiologiaController } from './fisiologia.controller';
import { FisiologiaService } from './fisiologia.service';
import { FisiologiaReportsService } from './fisiologia-reports.service';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule],
  controllers: [FisiologiaController],
  providers: [FisiologiaService, FisiologiaReportsService],
  exports: [FisiologiaService],
})
export class FisiologiaModule {}
