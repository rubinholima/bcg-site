import { Module } from '@nestjs/common';
import { MedicalStaffController } from './medical-staff.controller';
import { MedicalStaffService } from './medical-staff.service';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule],
  controllers: [MedicalStaffController],
  providers: [MedicalStaffService],
  exports: [MedicalStaffService],
})
export class MedicalStaffModule {}
