import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BostonCityHallController } from './boston-city-hall.controller';
import { BostonCityHallCatalogService } from './boston-city-hall-catalog.service';
import { BostonCityHallProposalPdfService } from './boston-city-hall-proposal-pdf.service';
import { BostonCityHallProposalsService } from './boston-city-hall-proposals.service';
import { BostonCityHallService } from './boston-city-hall.service';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule],
  controllers: [BostonCityHallController],
  providers: [
    BostonCityHallService,
    BostonCityHallCatalogService,
    BostonCityHallProposalsService,
    BostonCityHallProposalPdfService,
  ],
  exports: [
    BostonCityHallService,
    BostonCityHallCatalogService,
    BostonCityHallProposalsService,
  ],
})
export class BostonCityHallModule {}
