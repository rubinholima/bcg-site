import { Module, forwardRef } from '@nestjs/common';
import { FutebolAgendaModule } from '../futebol-agenda/futebol-agenda.module';
import { MediaModule } from '../media/media.module';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import { BeatscodeImportService } from './beatscode-import.service';
import { BeatscodeAgendaImportService } from './beatscode-agenda-import.service';

/** Contexto mínimo para scripts CLI (sem controller/guards). */
@Module({
  imports: [PrismaModule, S3Module, MediaModule, forwardRef(() => FutebolAgendaModule)],
  providers: [BeatscodeImportService, BeatscodeAgendaImportService],
  exports: [BeatscodeImportService, BeatscodeAgendaImportService],
})
export class BeatscodeImportScriptModule {}
