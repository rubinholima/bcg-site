import { Module, forwardRef } from '@nestjs/common';
import { FutebolAgendaModule } from '../futebol-agenda/futebol-agenda.module';
import { MediaModule } from '../media/media.module';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import { BeatscodeImportService } from './beatscode-import.service';
import { BeatscodeAgendaImportService } from './beatscode-agenda-import.service';
import { BeatscodeContractImportService } from './beatscode-contract-import.service';
import { BeatscodeAttachmentService } from './beatscode-attachment.service';
import { BeatscodeBrowserScraperService } from './beatscode-browser-scraper.service';
import { BeatscodeDocumentsImportService } from './beatscode-documents-import.service';

/** Contexto mínimo para scripts CLI (sem controller/guards). */
@Module({
  imports: [PrismaModule, S3Module, MediaModule, forwardRef(() => FutebolAgendaModule)],
  providers: [
    BeatscodeImportService,
    BeatscodeAgendaImportService,
    BeatscodeContractImportService,
    BeatscodeAttachmentService,
    BeatscodeBrowserScraperService,
    BeatscodeDocumentsImportService,
  ],
  exports: [
    BeatscodeImportService,
    BeatscodeAgendaImportService,
    BeatscodeContractImportService,
    BeatscodeAttachmentService,
    BeatscodeBrowserScraperService,
    BeatscodeDocumentsImportService,
  ],
})
export class BeatscodeImportScriptModule {}
