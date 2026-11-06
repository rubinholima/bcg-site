import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GroupModule } from '../group/group.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { PagesController } from './pages.controller';
import { TenantPublicPageController } from './tenant-public-page.controller';
import { PagesService } from './pages.service';

@Module({
  imports: [PrismaModule, AuthModule, GroupModule],
  controllers: [PagesController, TenantPublicPageController],
  providers: [PagesService, ModuleAccessGuard],
  exports: [PagesService],
})
export class PagesModule {}
