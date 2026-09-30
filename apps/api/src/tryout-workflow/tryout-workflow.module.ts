import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FisioterapiaModule } from '../fisioterapia/fisioterapia.module';
import { S3Module } from '../s3/s3.module';
import { MailService } from '../common/mail.service';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { TryoutWorkflowController } from './tryout-workflow.controller';
import { TryoutWorkflowService } from './tryout-workflow.service';
import { TryoutWorkflowEventsService } from './tryout-workflow-events.service';
import { TryoutProspectDocumentsService } from './tryout-prospect-documents.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ModulesModule,
    S3Module,
    forwardRef(() => FisioterapiaModule),
  ],
  controllers: [TryoutWorkflowController],
  providers: [
    TryoutWorkflowService,
    TryoutWorkflowEventsService,
    TryoutProspectDocumentsService,
    ModuleAccessGuard,
    MailService,
  ],
  exports: [TryoutWorkflowService],
})
export class TryoutWorkflowModule {}
