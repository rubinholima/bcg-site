import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { ModulesModule } from '../modules/modules.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FisioterapiaController } from './fisioterapia.controller';
import { FisioterapiaService } from './fisioterapia.service';
import { PhysioPlayerAvailabilityService } from '../common/physio-player-availability.service';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule],
  controllers: [FisioterapiaController],
  providers: [FisioterapiaService, ModuleAccessGuard, PhysioPlayerAvailabilityService],
  exports: [FisioterapiaService, PhysioPlayerAvailabilityService],
})
export class FisioterapiaModule {}
