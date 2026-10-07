import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModulesModule } from '../modules/modules.module';
import { PrismaModule } from '../prisma/prisma.module';
import { BostonCityHallController } from './boston-city-hall.controller';
import { BostonCityHallCatalogService } from './boston-city-hall-catalog.service';
import { BostonCityHallContractsService } from './boston-city-hall-contracts.service';
import { BostonCityHallFinanceService } from './boston-city-hall-finance.service';
import { BostonCityHallOperationsService } from './boston-city-hall-operations.service';
import { BostonCityHallBookingEventService } from './boston-city-hall-booking-event.service';
import { BostonCityHallProposalPdfService } from './boston-city-hall-proposal-pdf.service';
import { BostonCityHallProposalsService } from './boston-city-hall-proposals.service';
import { BostonCityHallService } from './boston-city-hall.service';
import { BostonCityHallTicketingService } from './boston-city-hall-ticketing.service';
import { BostonCityHallTicketInventoryService } from './boston-city-hall-ticket-inventory.service';
import { BostonCityHallTicketOrdersService } from './boston-city-hall-ticket-orders.service';
import { BostonCityHallTicketPaymentService } from './boston-city-hall-ticket-payment.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule, PaymentsModule],
  controllers: [BostonCityHallController],
  providers: [
    BostonCityHallService,
    BostonCityHallCatalogService,
    BostonCityHallProposalsService,
    BostonCityHallProposalPdfService,
    BostonCityHallContractsService,
    BostonCityHallFinanceService,
    BostonCityHallOperationsService,
    BostonCityHallBookingEventService,
    BostonCityHallTicketingService,
    BostonCityHallTicketInventoryService,
    BostonCityHallTicketOrdersService,
    BostonCityHallTicketPaymentService,
  ],
  exports: [
    BostonCityHallService,
    BostonCityHallCatalogService,
    BostonCityHallProposalsService,
    BostonCityHallContractsService,
    BostonCityHallFinanceService,
    BostonCityHallOperationsService,
    BostonCityHallBookingEventService,
    BostonCityHallTicketingService,
    BostonCityHallTicketInventoryService,
    BostonCityHallTicketOrdersService,
    BostonCityHallTicketPaymentService,
  ],
})
export class BostonCityHallModule {}
