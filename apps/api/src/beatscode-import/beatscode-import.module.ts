import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { MediaModule } from '../media/media.module';
import { ModulesModule } from '../modules/modules.module';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import { BeatscodeImportController } from './beatscode-import.controller';
import { BeatscodeImportService } from './beatscode-import.service';

@Module({
  imports: [AuthModule, ModulesModule, PrismaModule, S3Module, MediaModule],
  controllers: [BeatscodeImportController],
  providers: [BeatscodeImportService, ModuleAccessGuard],
  exports: [BeatscodeImportService],
})
export class BeatscodeImportModule {}
