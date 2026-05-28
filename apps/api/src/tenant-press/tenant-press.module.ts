import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MailService } from '../common/mail.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantPressController } from './tenant-press.controller';
import { TenantPressService } from './tenant-press.service';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [PrismaModule, AuthModule, S3Module],
  controllers: [TenantPressController],
  providers: [TenantPressService, MailService],
  exports: [TenantPressService],
})
export class TenantPressModule {}
