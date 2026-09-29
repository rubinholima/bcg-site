import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { MedicalEncountersController } from './medical-encounters.controller';
import { MedicalEncountersService } from './medical-encounters.service';
import { MedicalTimelineService } from './medical-timeline.service';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule],
  controllers: [MedicalEncountersController],
  providers: [MedicalEncountersService, MedicalTimelineService],
  exports: [MedicalEncountersService, MedicalTimelineService],
})
export class MedicalEncountersModule {}
