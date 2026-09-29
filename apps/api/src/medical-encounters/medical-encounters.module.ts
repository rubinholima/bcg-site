import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { S3Module } from '../s3/s3.module';
import { MedicalEncountersController } from './medical-encounters.controller';
import { MedicalEncountersService } from './medical-encounters.service';
import { MedicalTimelineService } from './medical-timeline.service';
import { MedicalPlayerOperationalService } from './medical-player-operational.service';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule, S3Module],
  controllers: [MedicalEncountersController],
  providers: [
    MedicalEncountersService,
    MedicalTimelineService,
    MedicalPlayerOperationalService,
  ],
  exports: [MedicalEncountersService, MedicalTimelineService],
})
export class MedicalEncountersModule {}
