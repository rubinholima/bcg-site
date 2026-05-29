import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import { BeatscodeImportService } from './beatscode-import.service';

/** Contexto mínimo para scripts CLI (sem controller/guards). */
@Module({
  imports: [PrismaModule, S3Module],
  providers: [BeatscodeImportService],
  exports: [BeatscodeImportService],
})
export class BeatscodeImportScriptModule {}
