import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BostonTvController } from './boston-tv.controller';
import { BostonTvService } from './boston-tv.service';
import { BostonTvIptvService } from './boston-tv-iptv.service';
import { BostonTvVmixService } from './boston-tv-vmix.service';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule],
  controllers: [BostonTvController],
  providers: [BostonTvService, BostonTvIptvService, BostonTvVmixService],
  exports: [BostonTvService, BostonTvIptvService, BostonTvVmixService],
})
export class BostonTvModule {}
