import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BostonCityHallController } from './boston-city-hall.controller';
import { BostonCityHallCatalogService } from './boston-city-hall-catalog.service';
import { BostonCityHallService } from './boston-city-hall.service';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule],
  controllers: [BostonCityHallController],
  providers: [BostonCityHallService, BostonCityHallCatalogService],
  exports: [BostonCityHallService, BostonCityHallCatalogService],
})
export class BostonCityHallModule {}
