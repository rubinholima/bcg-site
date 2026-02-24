import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { HomeContentController } from './home-content.controller';
import { HomeContentService } from './home-content.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [HomeContentController],
  providers: [HomeContentService],
  exports: [HomeContentService],
})
export class HomeContentModule {}
