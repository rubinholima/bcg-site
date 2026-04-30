import { Module } from '@nestjs/common';
import { MarketingPostsController } from './marketing-posts.controller';
import { MarketingPostsService } from './marketing-posts.service';
import { MarketingSchedulerService } from './marketing-scheduler.service';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { PrismaModule } from '../prisma/prisma.module';
import { IntegrationsModule } from '../integrations/integrations.module';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule, IntegrationsModule],
  controllers: [MarketingPostsController],
  providers: [MarketingPostsService, MarketingSchedulerService],
  exports: [MarketingPostsService],
})
export class MarketingModule {}
