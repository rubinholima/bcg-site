import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { MedicalDeparturesController } from './medical-departures.controller';
import { MedicalDeparturesService } from './medical-departures.service';
import { MedicalDeparturesReportsService } from './medical-departures-reports.service';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule],
  controllers: [MedicalDeparturesController],
  providers: [MedicalDeparturesService, MedicalDeparturesReportsService],
  exports: [MedicalDeparturesService, MedicalDeparturesReportsService],
})
export class MedicalDeparturesModule {}
