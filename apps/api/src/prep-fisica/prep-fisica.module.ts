import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrepFisicaController } from './prep-fisica.controller';
import { PrepFisicaService } from './prep-fisica.service';
import { PrepLoadSyncService } from './prep-load-sync.service';
import { PrepPseService } from './prep-pse.service';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule],
  controllers: [PrepFisicaController],
  providers: [PrepFisicaService, PrepLoadSyncService, PrepPseService],
  exports: [PrepLoadSyncService, PrepPseService, PrepFisicaService],
})
export class PrepFisicaModule {}
