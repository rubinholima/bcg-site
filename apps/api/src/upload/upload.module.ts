import { Module } from '@nestjs/common';
import { GroupModule } from '../group/group.module';
import { S3Module } from '../s3/s3.module';
import { TenantsModule } from '../tenants/tenants.module';
import { UploadController } from './upload.controller';

@Module({
  imports: [S3Module, TenantsModule, GroupModule],
  controllers: [UploadController],
})
export class UploadModule {}
