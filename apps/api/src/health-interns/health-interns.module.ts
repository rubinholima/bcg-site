import { Module } from '@nestjs/common';
import { HealthInternsController } from './health-interns.controller';
import { HealthInternsService } from './health-interns.service';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule],
  controllers: [HealthInternsController],
  providers: [HealthInternsService],
  exports: [HealthInternsService],
})
export class HealthInternsModule {}
