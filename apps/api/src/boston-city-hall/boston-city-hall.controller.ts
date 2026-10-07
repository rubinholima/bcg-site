import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { BostonCityHallCatalogService } from './boston-city-hall-catalog.service';
import { buildVenueContractPrintHtml } from './boston-city-hall-contract-print.util';
import { BostonCityHallContractsService } from './boston-city-hall-contracts.service';
import { BostonCityHallFinanceService } from './boston-city-hall-finance.service';
import { BostonCityHallOperationsService } from './boston-city-hall-operations.service';
import { BostonCityHallBookingEventService } from './boston-city-hall-booking-event.service';
import { BostonCityHallProposalPdfService } from './boston-city-hall-proposal-pdf.service';
import { BostonCityHallProposalsService } from './boston-city-hall-proposals.service';
import { BostonCityHallService } from './boston-city-hall.service';
import { BostonCityHallTicketingService } from './boston-city-hall-ticketing.service';
import { BostonCityHallTicketOrdersService } from './boston-city-hall-ticket-orders.service';
import { BostonCityHallTicketPaymentService } from './boston-city-hall-ticket-payment.service';
import { BostonCityHallTicketIssuanceService } from './boston-city-hall-ticket-issuance.service';
import type { PaymentMethod } from '../payments/payment-core.constants';

@Controller('boston-city-hall')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('eventos')
export class BostonCityHallController {
  constructor(
    private readonly service: BostonCityHallService,
    private readonly catalog: BostonCityHallCatalogService,
    private readonly proposals: BostonCityHallProposalsService,
    private readonly proposalPdf: BostonCityHallProposalPdfService,
    private readonly contracts: BostonCityHallContractsService,
    private readonly finance: BostonCityHallFinanceService,
    private readonly operations: BostonCityHallOperationsService,
    private readonly bookingEvent: BostonCityHallBookingEventService,
    private readonly ticketing: BostonCityHallTicketingService,
    private readonly ticketOrders: BostonCityHallTicketOrdersService,
    private readonly ticketPayment: BostonCityHallTicketPaymentService,
    private readonly ticketIssuance: BostonCityHallTicketIssuanceService,
  ) {}

  @Get('overview')
  overview() {
    return this.service.getOverview();
  }

  @Get('spaces')
  listSpaces(@Query('all') all?: string) {
    const includeInactive = all === '1' || all === 'true';
    return this.service.listSpaces({ includeInactive });
  }

  @Get('spaces/:id')
  getSpace(@Param('id') id: string) {
    return this.service.getSpace(id);
  }

  @Post('spaces')
  createSpace(
    @Body()
    body: {
      name: string;
      slug?: string;
      capacityStanding?: number;
      capacitySeated?: number;
      sortOrder?: number;
      active?: boolean;
    },
  ) {
    return this.service.createSpace(body);
  }

  @Patch('spaces/:id')
  updateSpace(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      capacityStanding: number | null;
      capacitySeated: number | null;
      sortOrder: number;
      active: boolean;
    }>,
  ) {
    return this.service.updateSpace(id, body);
  }

  @Get('bookings')
  listBookings(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('spaceId') spaceId?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('eventType') eventType?: string,
    @Query('sort') sort?: string,
  ) {
    return this.service.listBookings({ from, to, spaceId, status, q, eventType, sort });
  }

  @Get('bookings/:id/event-prefill')
  getBookingEventPrefill(@Param('id') id: string) {
    return this.bookingEvent.getPrefill(id);
  }

  @Post('bookings/:id/event')
  createBookingEvent(
    @Param('id') id: string,
    @Body()
    body: {
      name: string;
      slug?: string;
      description?: string;
      startDate?: string;
      endDate?: string;
      category?: 'football' | 'other';
    },
  ) {
    return this.bookingEvent.createEventFromBooking(id, body);
  }

  @Post('bookings/:id/event-link')
  linkBookingEvent(@Param('id') id: string, @Body() body: { eventId: string }) {
    return this.bookingEvent.linkExistingEvent(id, body);
  }

  @Get('bookings/:id')
  getBooking(@Param('id') id: string) {
    return this.service.getBooking(id);
  }

  @Post('bookings')
  createBooking(
    @Body()
    body: {
      spaceId: string;
      title: string;
      eventType?: string;
      startAt: string;
      endAt: string;
      status?: string;
      pipelineLeadId?: string;
      contactName?: string;
      contactEmail?: string;
      contactPhone?: string;
      guestCount?: number;
      notes?: string;
    },
  ) {
    return this.service.createBooking(body);
  }

  @Patch('bookings/:id')
  updateBooking(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      spaceId: string;
      title: string;
      eventType: string;
      startAt: string;
      endAt: string;
      status: string;
      contactName: string;
      contactEmail: string;
      contactPhone: string;
      guestCount: number;
      notes: string;
      pipelineLeadId: string | null;
    }>,
  ) {
    return this.service.updateBooking(id, body);
  }

  @Delete('bookings/:id')
  async deleteBooking(@Param('id') id: string) {
    await this.service.deleteBooking(id);
    return { ok: true };
  }

  @Get('pipeline')
  listPipeline(
    @Query('stage') stage?: string,
    @Query('source') source?: string,
    @Query('q') q?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
    @Query('commercialStatus') commercialStatus?: string,
    @Query('sort') sort?: string,
    @Query('eventType') eventType?: string,
  ) {
    return this.service.listPipeline({
      stage,
      source,
      q,
      createdFrom,
      createdTo,
      commercialStatus,
      sort,
      eventType,
    });
  }

  @Get('pipeline/:id')
  getPipelineLead(@Param('id') id: string) {
    return this.service.getPipelineLead(id);
  }

  @Post('pipeline')
  createPipelineLead(
    @Body()
    body: {
      contactName: string;
      contactEmail: string;
      contactPhone?: string;
      companyName?: string;
      eventType?: string;
      guestCount?: number;
      preferredDate?: string;
      message?: string;
      stage?: string;
      notes?: string;
    },
  ) {
    return this.service.createPipelineLead(body);
  }

  @Patch('pipeline/:id')
  updatePipelineLead(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      contactName: string;
      contactEmail: string;
      contactPhone: string;
      companyName: string;
      eventType: string;
      guestCount: number;
      preferredDate: string;
      message: string;
      stage: string;
      notes: string;
    }>,
  ) {
    return this.service.updatePipelineLead(id, body);
  }

  @Get('catalog/services')
  listCatalogServices(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('active') active?: string,
  ) {
    const activeFilter =
      active === 'true' || active === 'false' ? active : ('all' as const);
    return this.catalog.listCatalogServices({ q, category, active: activeFilter });
  }

  @Get('catalog/services/:id')
  getCatalogService(@Param('id') id: string) {
    return this.catalog.getCatalogService(id);
  }

  @Post('catalog/services')
  createCatalogService(
    @Body()
    body: {
      name: string;
      description?: string;
      category: string;
      defaultPrice: number | string;
      billingUnit: string;
      sortOrder?: number;
      active?: boolean;
    },
  ) {
    return this.catalog.createCatalogService(body);
  }

  @Patch('catalog/services/:id')
  updateCatalogService(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      description: string | null;
      category: string;
      defaultPrice: number | string;
      billingUnit: string;
      sortOrder: number;
      active: boolean;
    }>,
  ) {
    return this.catalog.updateCatalogService(id, body);
  }

  @Get('catalog/packages')
  listCatalogPackages(
    @Query('q') q?: string,
    @Query('active') active?: string,
  ) {
    const activeFilter =
      active === 'true' || active === 'false' ? active : ('all' as const);
    return this.catalog.listCatalogPackages({ q, active: activeFilter });
  }

  @Get('catalog/packages/:id')
  getCatalogPackage(@Param('id') id: string) {
    return this.catalog.getCatalogPackage(id);
  }

  @Post('catalog/packages')
  createCatalogPackage(
    @Body()
    body: {
      name: string;
      description?: string;
      defaultPrice: number | string;
      sortOrder?: number;
      active?: boolean;
      items?: Array<{ serviceId: string; quantity: number | string }>;
    },
  ) {
    return this.catalog.createCatalogPackage(body);
  }

  @Patch('catalog/packages/:id')
  updateCatalogPackage(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      description: string | null;
      defaultPrice: number | string;
      sortOrder: number;
      active: boolean;
      items: Array<{ serviceId: string; quantity: number | string }>;
    }>,
  ) {
    return this.catalog.updateCatalogPackage(id, body);
  }

  @Get('proposals')
  listProposals(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('updatedFrom') updatedFrom?: string,
    @Query('updatedTo') updatedTo?: string,
  ) {
    return this.proposals.listProposals({ q, status, updatedFrom, updatedTo });
  }

  @Get('proposals/:id')
  getProposal(@Param('id') id: string) {
    return this.proposals.getProposal(id);
  }

  @Post('proposals')
  createProposal(
    @Body()
    body: {
      title?: string;
      pipelineLeadId?: string;
      bookingId?: string;
      contactName?: string;
      contactEmail?: string;
      contactPhone?: string;
      companyName?: string;
      eventType?: string;
      eventDate?: string;
      guestCount?: number;
      discount?: number | string;
      tax?: number | string;
      notes?: string;
      terms?: string;
      validUntil?: string;
      items?: Array<{
        sourceType: string;
        sourceServiceId?: string;
        sourcePackageId?: string;
        name?: string;
        description?: string | null;
        quantity: number | string;
        unitPrice?: number | string;
        sortOrder?: number;
      }>;
    },
  ) {
    return this.proposals.createProposal(body);
  }

  @Patch('proposals/:id')
  updateProposal(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      status: string;
      title: string;
      pipelineLeadId: string | null;
      bookingId: string | null;
      contactName: string;
      contactEmail: string;
      contactPhone: string | null;
      companyName: string | null;
      eventType: string | null;
      eventDate: string | null;
      guestCount: number | null;
      discount: number | string;
      tax: number | string;
      notes: string | null;
      terms: string | null;
      validUntil: string | null;
      items: Array<{
        sourceType: string;
        sourceServiceId?: string;
        sourcePackageId?: string;
        name?: string;
        description?: string | null;
        quantity: number | string;
        unitPrice?: number | string;
        sortOrder?: number;
      }>;
    }>,
  ) {
    return this.proposals.updateProposal(id, body);
  }

  @Post('proposals/:id/duplicate')
  duplicateProposal(@Param('id') id: string) {
    return this.proposals.duplicateProposal(id);
  }

  @Get('proposals/:id/pdf')
  @Header('Cache-Control', 'private, no-store, max-age=0')
  @Header('Pragma', 'no-cache')
  async downloadProposalPdf(@Param('id') id: string) {
    const proposal = await this.proposals.getProposal(id);
    const pdf = await this.proposalPdf.renderProposalPdf(proposal);
    const safe = proposal.proposalNumber.replace(/[^\w-]/g, '');
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `attachment; filename="proposta-${safe}.pdf"`,
    });
  }

  @Get('contracts')
  listContracts(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('updatedFrom') updatedFrom?: string,
    @Query('updatedTo') updatedTo?: string,
  ) {
    return this.contracts.listContracts({ q, status, updatedFrom, updatedTo });
  }

  @Get('contracts/:id')
  getContract(@Param('id') id: string) {
    return this.contracts.getContract(id);
  }

  @Post('contracts')
  createContract(@Body() body: { proposalId: string }) {
    return this.contracts.createContractFromProposal(body);
  }

  @Patch('contracts/:id')
  updateContract(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      status: string;
      notes: string | null;
      terms: string | null;
      validFrom: string | null;
      validUntil: string | null;
    }>,
  ) {
    return this.contracts.updateContract(id, body);
  }

  @Get('contracts/:id/pdf')
  @Header('Cache-Control', 'private, no-store, max-age=0')
  @Header('Pragma', 'no-cache')
  async downloadContractPdf(@Param('id') id: string) {
    const contract = await this.contracts.getContract(id);
    const html = buildVenueContractPrintHtml(contract);
    const pdf = await this.proposalPdf.renderHtmlToPdf(html);
    const safe = contract.contractNumber.replace(/[^\w-]/g, '');
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `attachment; filename="contrato-${safe}.pdf"`,
    });
  }

  @Get('operations')
  listOperations(
    @Query('q') q?: string,
    @Query('spaceId') spaceId?: string,
    @Query('status') status?: string,
    @Query('financeStatus') financeStatus?: string,
    @Query('view') view?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.operations.listOperations({
      q,
      spaceId,
      status,
      financeStatus,
      view,
      from,
      to,
    });
  }

  @Get('operations/:bookingId')
  getOperation(@Param('bookingId') bookingId: string) {
    return this.operations.getOperation(bookingId);
  }

  @Get('finance/overview')
  financeOverview() {
    return this.finance.getOverviewKpisForVenue();
  }

  @Get('finance')
  listFinance(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('overdueOnly') overdueOnly?: string,
    @Query('updatedFrom') updatedFrom?: string,
  ) {
    const statusFilter =
      status === 'unpaid' ||
      status === 'partial' ||
      status === 'paid' ||
      status === 'overdue' ||
      status === 'cancelled'
        ? status
        : 'all';
    return this.finance.listReceivables({
      q,
      status: statusFilter,
      overdueOnly: overdueOnly === '1' || overdueOnly === 'true',
      updatedFrom,
    });
  }

  @Get('finance/:id')
  getFinance(@Param('id') id: string) {
    return this.finance.getReceivable(id);
  }

  @Post('finance')
  createFinance(
    @Body()
    body: {
      contractId: string;
      notes?: string;
      installments: Array<{
        label?: string;
        dueDate: string;
        amount: number | string;
        notes?: string;
      }>;
    },
  ) {
    return this.finance.createReceivable(body);
  }

  @Post('finance/:id/payments')
  registerPayment(
    @Param('id') id: string,
    @Body()
    body: {
      installmentId: string;
      amount: number | string;
      paidAt: string;
      paymentMethod: string;
      reference?: string;
      notes?: string;
    },
  ) {
    return this.finance.registerPayment(id, body);
  }

  @Patch('finance/:id/installments/:installmentId')
  updateInstallment(
    @Param('id') id: string,
    @Param('installmentId') installmentId: string,
    @Body()
    body: Partial<{
      label: string | null;
      dueDate: string;
      amount: number | string;
      notes: string | null;
    }>,
  ) {
    return this.finance.updateInstallment(id, installmentId, body);
  }

  @Get('ticketing/events')
  listTicketingEvents() {
    return this.ticketing.listEvents();
  }

  @Get('ticketing/events/:eventId')
  getEventTicketing(@Param('eventId') eventId: string) {
    return this.ticketing.getEventTicketing(eventId);
  }

  @Patch('ticketing/events/:eventId')
  setEventTicketingEnabled(
    @Param('eventId') eventId: string,
    @Body() body: { enabled: boolean; currency?: string },
  ) {
    return this.ticketing.setTicketingEnabled(eventId, !!body.enabled, body.currency);
  }

  @Post('ticketing/events/:eventId/types')
  createTicketType(
    @Param('eventId') eventId: string,
    @Body()
    body: {
      name: string;
      description?: string;
      price?: number | string;
      quantity?: number | string;
      purchaseLimit?: number | string | null;
      active?: boolean;
      sortOrder?: number;
      salesStartAt?: string | null;
      salesEndAt?: string | null;
    },
  ) {
    return this.ticketing.createTicketType(eventId, body);
  }

  @Patch('ticketing/types/:id')
  updateTicketType(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      description: string | null;
      price: number | string | null;
      quantity: number | string | null;
      purchaseLimit: number | string | null;
      active: boolean;
      sortOrder: number;
      salesStartAt: string | null;
      salesEndAt: string | null;
    }>,
  ) {
    return this.ticketing.updateTicketType(id, body);
  }

  @Post('ticketing/types/:id/lots')
  createTicketLot(
    @Param('id') id: string,
    @Body()
    body: {
      name: string;
      price: number | string;
      quantity: number | string;
      active?: boolean;
      sortOrder?: number;
      salesStartAt?: string | null;
      salesEndAt?: string | null;
    },
  ) {
    return this.ticketing.createLot(id, body);
  }

  @Get('ticketing/orders')
  listTicketOrders(
    @Query('eventId') eventId?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
  ) {
    return this.ticketOrders.listOrders({ eventId, status, q });
  }

  @Get('ticketing/orders/:id')
  getTicketOrder(@Param('id') id: string) {
    return this.ticketOrders.getOrder(id);
  }

  @Post('ticketing/orders')
  createTicketOrder(
    @Body()
    body: {
      eventId: string;
      customer: { name: string; email: string; phone?: string; document?: string };
      items: Array<{ ticketTypeId: string; quantity: number | string }>;
    },
  ) {
    return this.ticketOrders.createOrder(body);
  }

  @Post('ticketing/orders/:id/cancel')
  cancelTicketOrder(@Param('id') id: string) {
    return this.ticketOrders.cancelOrder(id);
  }

  @Post('ticketing/orders/:id/manual-payment')
  async recordTicketOrderManualPayment(
    @Param('id') id: string,
    @Body()
    body: {
      paymentMethod: string;
      paidAt?: string;
      manualReference?: string;
      manualNotes?: string;
      externalProviderLabel?: string;
    },
  ) {
    const result = await this.ticketPayment.recordManualPaymentForOrderId(id, {
      paymentMethod: body.paymentMethod as PaymentMethod,
      paidAt: body.paidAt,
      manualReference: body.manualReference,
      manualNotes: body.manualNotes,
      externalProviderLabel: body.externalProviderLabel,
    });
    const order = await this.ticketOrders.getOrder(id);
    return { ...result, order };
  }

  @Get('ticketing/tickets/lookup')
  lookupTicket(
    @Query('code') code?: string,
    @Query('credential') credential?: string,
  ) {
    const c = code?.trim();
    const cred = credential?.trim();
    if (c) return this.ticketIssuance.lookupByCodeForVenue(c);
    if (cred) return this.ticketIssuance.lookupByCredentialForVenue(cred);
    throw new BadRequestException('Informe code ou credential.');
  }

  @Get('ticketing/tickets/:id/qr')
  @Header('Content-Type', 'image/png')
  @Header('Cache-Control', 'private, no-store')
  async getTicketQrPng(@Param('id') id: string) {
    const buffer = await this.ticketIssuance.renderQrPngForVenue(id);
    return new StreamableFile(buffer);
  }

  @Patch('ticketing/lots/:id')
  updateTicketLot(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      price: number | string;
      quantity: number | string;
      active: boolean;
      sortOrder: number;
      salesStartAt: string | null;
      salesEndAt: string | null;
    }>,
  ) {
    return this.ticketing.updateLot(id, body);
  }
}
