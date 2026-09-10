import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { S3Module } from '../s3/s3.module';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { DesenvolvimentoService } from './desenvolvimento.service';
import { DesenvolvimentoAdminController } from './desenvolvimento-admin.controller';
import { DesenvolvimentoStudentController } from './desenvolvimento-student.controller';
import { LearningContentImportService } from './content/learning-content-import.service';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule, S3Module],
  controllers: [
    DesenvolvimentoAdminController,
    DesenvolvimentoStudentController,
  ],
  providers: [DesenvolvimentoService, LearningContentImportService, ModuleAccessGuard],
  exports: [DesenvolvimentoService, LearningContentImportService],
})
export class DesenvolvimentoModule {}
