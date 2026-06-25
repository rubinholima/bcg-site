import { Module } from '@nestjs/common';
import { PsychologySupportMaterialsController } from './psychology-support-materials.controller';
import { PsychologySupportMaterialsService } from './psychology-support-materials.service';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import { ModuleAccessGuard } from '../auth/module-access.guard';

@Module({
  imports: [PrismaModule, S3Module, AuthModule, ModulesModule],
  controllers: [PsychologySupportMaterialsController],
  providers: [PsychologySupportMaterialsService, ModuleAccessGuard],
  exports: [PsychologySupportMaterialsService],
})
export class PsychologySupportMaterialsModule {}
