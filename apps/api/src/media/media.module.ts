import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import { MediaController } from './media.controller';
import { MediaMetaService } from './media-meta.service';

@Module({
  imports: [PrismaModule, AuthModule, S3Module],
  controllers: [MediaController],
  providers: [MediaMetaService],
  exports: [MediaMetaService],
})
export class MediaModule {}
