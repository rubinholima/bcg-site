import { Module } from '@nestjs/common';
import { TenantKindsController } from './tenant-kinds.controller';
import { TenantKindsService } from './tenant-kinds.service';

@Module({
  controllers: [TenantKindsController],
  providers: [TenantKindsService],
  exports: [TenantKindsService],
})
export class TenantKindsModule {}
