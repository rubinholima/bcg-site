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
  providers: [BeatscodeImportService, BeatscodeAgendaImportService, ModuleAccessGuard],
  exports: [BeatscodeImportService, BeatscodeAgendaImportService],
})
export class BeatscodeImportModule {}
