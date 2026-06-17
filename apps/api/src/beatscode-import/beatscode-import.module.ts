import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { MediaModule } from '../media/media.module';
import { ModulesModule } from '../modules/modules.module';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import { FutebolAgendaModule } from '../futebol-agenda/futebol-agenda.module';
import { BeatscodeImportController } from './beatscode-import.controller';
import { BeatscodeImportService } from './beatscode-import.service';
import { BeatscodeAgendaImportService } from './beatscode-agenda-import.service';
import { BeatscodeContractImportService } from './beatscode-contract-import.service';
import { BeatscodeAttachmentService } from './beatscode-attachment.service';
import { BeatscodeBrowserScraperService } from './beatscode-browser-scraper.service';
import { BeatscodeDocumentsImportService } from './beatscode-documents-import.service';

@Module({
  imports: [
    AuthModule,
    ModulesModule,
    PrismaModule,
    S3Module,
    MediaModule,
    forwardRef(() => FutebolAgendaModule),
  ],
  controllers: [BeatscodeImportController],
  providers: [
    BeatscodeImportService,
    BeatscodeAgendaImportService,
    BeatscodeContractImportService,
    BeatscodeAttachmentService,
    BeatscodeBrowserScraperService,
    BeatscodeDocumentsImportService,
    ModuleAccessGuard,
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
export class BeatscodeImportModule {}
