import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { ModulesModule } from '../modules/modules.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MailService } from '../common/mail.service';
import { FisioterapiaController } from './fisioterapia.controller';
import { FisioterapiaService } from './fisioterapia.service';
import { PhysioTryoutClearanceService } from './physio-tryout-clearance.service';
import { PhysioPlayerAvailabilityService } from '../common/physio-player-availability.service';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule],
  controllers: [FisioterapiaController],
  providers: [
    FisioterapiaService,
    PhysioTryoutClearanceService,
    ModuleAccessGuard,
    PhysioPlayerAvailabilityService,
    MailService,
  ],
  exports: [FisioterapiaService, PhysioTryoutClearanceService, PhysioPlayerAvailabilityService],
})
export class FisioterapiaModule {}
