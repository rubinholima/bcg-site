import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { TenantKindsModule } from './tenant-kinds/tenant-kinds.module';
import { TenantsModule } from './tenants/tenants.module';

@Module({
  imports: [PrismaModule, TenantsModule, TenantKindsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
