import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { PrismaModule } from '../prisma/prisma.module';
import { FisioterapiaModule } from '../fisioterapia/fisioterapia.module';
import { MailService } from '../common/mail.service';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { TryoutWorkflowController } from './tryout-workflow.controller';
import { TryoutWorkflowService } from './tryout-workflow.service';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule, forwardRef(() => FisioterapiaModule)],
  controllers: [TryoutWorkflowController],
  providers: [TryoutWorkflowService, ModuleAccessGuard, MailService],
  exports: [TryoutWorkflowService],
})
export class TryoutWorkflowModule {}
