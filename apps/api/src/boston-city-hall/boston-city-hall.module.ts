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
import { BostonCityHallTicketFinanceProjectionService } from './boston-city-hall-ticket-finance-projection.service';
import { BostonCityHallTicketIssuanceService } from './boston-city-hall-ticket-issuance.service';
import { BostonCityHallTicketCheckinService } from './boston-city-hall-ticket-checkin.service';
import { BostonCityHallComplimentaryService } from './boston-city-hall-complimentary.service';
import { BostonCityHallSeatingService } from './boston-city-hall-seating.service';
import { BostonCityHallTicketReportsService } from './boston-city-hall-ticket-reports.service';
import { PaymentsModule } from '../payments/payments.module';
import { FinanceiroModule } from '../financeiro/financeiro.module';
import { HomeContentModule } from '../home-content/home-content.module';
import { BostonCityHallPublicEventsService } from './boston-city-hall-public-events.service';
import { BostonCityHallPublicCheckoutService } from './boston-city-hall-public-checkout.service';
import { BostonCityHallPublicTicketService } from './boston-city-hall-public-ticket.service';
import { BostonCityHallMyTicketsService } from './boston-city-hall-my-tickets.service';
import { BostonCityHallPublicNotificationService } from './boston-city-hall-public-notification.service';
import { MailService } from '../common/mail.service';

@Module({
  imports: [PrismaModule, AuthModule, ModulesModule, PaymentsModule, FinanceiroModule, HomeContentModule],
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
    BostonCityHallTicketFinanceProjectionService,
    BostonCityHallTicketIssuanceService,
    BostonCityHallTicketCheckinService,
    BostonCityHallComplimentaryService,
    BostonCityHallSeatingService,
    BostonCityHallTicketReportsService,
    BostonCityHallPublicEventsService,
    BostonCityHallPublicCheckoutService,
    BostonCityHallPublicTicketService,
    BostonCityHallMyTicketsService,
    BostonCityHallPublicNotificationService,
    MailService,
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
    BostonCityHallTicketFinanceProjectionService,
    BostonCityHallTicketIssuanceService,
    BostonCityHallTicketCheckinService,
    BostonCityHallComplimentaryService,
    BostonCityHallSeatingService,
    BostonCityHallTicketReportsService,
    BostonCityHallPublicEventsService,
    BostonCityHallPublicCheckoutService,
    BostonCityHallPublicTicketService,
    BostonCityHallMyTicketsService,
    BostonCityHallPublicNotificationService,
  ],
})
export class BostonCityHallModule {}
