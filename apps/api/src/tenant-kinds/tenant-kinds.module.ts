import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TenantKindsController } from './tenant-kinds.controller';
import { TenantKindsService } from './tenant-kinds.service';

@Module({
  imports: [AuthModule],
  controllers: [TenantKindsController],
  providers: [TenantKindsService],
  exports: [TenantKindsService],
})
export class TenantKindsModule {}