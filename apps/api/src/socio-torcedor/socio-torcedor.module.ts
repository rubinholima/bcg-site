import { Module } from '@nestjs/common';
import { SocioPlansController } from './socio-plans.controller';
import { SocioPlansService } from './socio-plans.service';
import { SocioMembersController } from './socio-members.controller';
import { SocioMembersService } from './socio-members.service';
import { SocioDashboardController } from './socio-dashboard.controller';
import { SocioDashboardService } from './socio-dashboard.service';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule],
  controllers: [
    SocioPlansController,
    SocioMembersController,
    SocioDashboardController,
  ],
  providers: [SocioPlansService, SocioMembersService, SocioDashboardService],
  exports: [SocioPlansService, SocioMembersService, SocioDashboardService],
})
export class SocioTorcedorModule {}
