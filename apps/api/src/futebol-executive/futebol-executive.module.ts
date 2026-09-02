import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FisioterapiaModule } from '../fisioterapia/fisioterapia.module';
import { FutebolExecutiveController } from './futebol-executive.controller';
import { FutebolExecutiveService } from './futebol-executive.service';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule, FisioterapiaModule],
  controllers: [FutebolExecutiveController],
  providers: [FutebolExecutiveService],
})
export class FutebolExecutiveModule {}
