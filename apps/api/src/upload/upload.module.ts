import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GroupModule } from '../group/group.module';
import { S3Module } from '../s3/s3.module';
import { TenantsModule } from '../tenants/tenants.module';
import { UploadController } from './upload.controller';

@Module({
  imports: [AuthModule, S3Module, TenantsModule, GroupModule],
  controllers: [UploadController],
})
export class UploadModule {}
