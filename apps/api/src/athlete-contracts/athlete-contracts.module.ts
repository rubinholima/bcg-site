import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { AthleteContractsController } from './athlete-contracts.controller';
import { AthleteContractsService } from './athlete-contracts.service';

@Module({
  imports: [AuthModule, ModulesModule],
  controllers: [AthleteContractsController],
  providers: [AthleteContractsService],
  exports: [AthleteContractsService],
})
export class AthleteContractsModule {}
