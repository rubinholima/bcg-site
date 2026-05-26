import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailService } from '../common/mail.service';
import { ModulesModule } from '../modules/modules.module';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { S3Module } from '../s3/s3.module';
import { RegistrationInviteController } from './registration-invite.controller';
import { RegistrationInviteService } from './registration-invite.service';

@Module({
  imports: [AuthModule, ModulesModule, S3Module],
  controllers: [RegistrationInviteController],
  providers: [RegistrationInviteService, MailService, ModuleAccessGuard],
  exports: [RegistrationInviteService],
})
export class RegistrationInviteModule {}
