import { Module } from '@nestjs/common';
import { MarketingPostsController } from './marketing-posts.controller';
import { MarketingPostsService } from './marketing-posts.service';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule],
  controllers: [MarketingPostsController],
  providers: [MarketingPostsService],
  exports: [MarketingPostsService],
})
export class MarketingModule {}
