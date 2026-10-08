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
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
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
import { BostonCityHallTicketCheckinService } from './boston-city-hall-ticket-checkin.service';
import { BostonCityHallComplimentaryService } from './boston-city-hall-complimentary.service';
import { BostonCityHallSeatingService } from './boston-city-hall-seating.service';
import { BostonCityHallTicketReportsService } from './boston-city-hall-ticket-reports.service';
import type { TicketReportQueryDto } from './boston-city-hall-ticket-reports.constants';
import { TenantAccessService } from '../auth/tenant-access.service';
import type { CognitoJwtPayload } from '../auth/jwt-auth.guard';
import type { PaymentMethod } from '../payments/payment-core.constants';
import { BostonCityHallBarService } from './boston-city-hall-bar.service';
import { BostonCityHallBarStockService } from './boston-city-hall-bar-stock.service';
import { BostonCityHallBarOpenContainerService } from './boston-city-hall-bar-open-container.service';
import { BostonCityHallBarPosService } from './boston-city-hall-bar-pos.service';
import { BostonCityHallBarEventInventoryService } from './boston-city-hall-bar-event-inventory.service';

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
    private readonly ticketCheckin: BostonCityHallTicketCheckinService,
    private readonly complimentary: BostonCityHallComplimentaryService,
    private readonly seating: BostonCityHallSeatingService,
    private readonly ticketReports: BostonCityHallTicketReportsService,
    private readonly tenantAccess: TenantAccessService,
    private readonly bar: BostonCityHallBarService,
    private readonly barStock: BostonCityHallBarStockService,
    private readonly barOpen: BostonCityHallBarOpenContainerService,
    private readonly barPos: BostonCityHallBarPosService,
    private readonly barEventInventory: BostonCityHallBarEventInventoryService,
  ) {}

  private async bchTenantId(): Promise<string> {
    return this.bar.resolveBchTenantId();
  }

  private parseTicketReportQuery(query: Record<string, string | undefined>): TicketReportQueryDto {
    const eventId = query.eventId?.trim();
    if (!eventId) throw new BadRequestException('eventId é obrigatório.');
    const admissionSource = query.admissionSource?.trim();
    return {
      eventId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      ticketTypeId: query.ticketTypeId,
      ticketLotId: query.ticketLotId,
      admissionSource:
        admissionSource === 'paid_order' || admissionSource === 'complimentary'
          ? admissionSource
          : undefined,
      ticketStatus: query.ticketStatus,
      complimentaryReason: query.complimentaryReason,
      stationLabel: query.stationLabel,
      operatorUserId: query.operatorUserId,
    };
  }

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

  @Post('ticketing/checkin')
  async checkinTicket(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body()
    body: {
      eventId: string;
      credential?: string;
      ticketCode?: string;
      stationLabel?: string;
    },
  ) {
    const scanInput = (body.credential ?? body.ticketCode ?? '').trim();
    const operatorUserId = await this.tenantAccess.resolveInternalUserId(req.user.sub);
    return this.ticketCheckin.performCheckinForVenue({
      eventId: body.eventId,
      scanInput,
      operatorUserId,
      stationLabel: body.stationLabel,
    });
  }

  @Get('ticketing/checkins/recent')
  listRecentCheckins(@Query('eventId') eventId: string, @Query('limit') limit?: string) {
    const n = limit ? Number.parseInt(limit, 10) : 40;
    return this.ticketCheckin.listRecentForVenue(eventId, Number.isFinite(n) ? n : 40);
  }

  @Get('ticketing/complimentary')
  listComplimentary(
    @Query('eventId') eventId: string,
    @Query('q') q?: string,
    @Query('reason') reason?: string,
    @Query('status') status?: string,
  ) {
    return this.complimentary.listGuestListForVenue({ eventId, q, reason, status });
  }

  @Get('ticketing/complimentary/:id')
  getComplimentary(@Param('id') id: string) {
    return this.complimentary.getAdmissionDetailForVenue(id);
  }

  @Post('ticketing/complimentary')
  async createComplimentary(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body()
    body: {
      eventId: string;
      ticketTypeId: string;
      ticketLotId?: string | null;
      guestName: string;
      guestEmail?: string;
      guestPhone?: string;
      quantity: number;
      reason: string;
      notes?: string;
    },
  ) {
    const operatorUserId = await this.tenantAccess.resolveInternalUserId(req.user.sub);
    return this.complimentary.createAndIssueForVenue(body, operatorUserId);
  }

  @Post('ticketing/complimentary/:id/issue')
  issueComplimentary(@Param('id') id: string) {
    return this.complimentary.issueComplimentaryForVenue(id);
  }

  @Post('ticketing/complimentary/:id/cancel-unused')
  cancelComplimentaryUnused(@Param('id') id: string) {
    return this.complimentary.cancelUnusedTicketsForVenue(id);
  }

  @Get('ticketing/guests/search')
  searchGuests(@Query('eventId') eventId: string, @Query('q') q: string) {
    return this.complimentary.searchGuestsForVenue(eventId, q ?? '');
  }

  @Get('ticketing/tables')
  listTables(@Query('eventId') eventId: string) {
    return this.seating.listTablesForVenue(eventId);
  }

  @Post('ticketing/tables')
  createTable(
    @Body()
    body: {
      eventId: string;
      name: string;
      capacity: number;
      section?: string;
      notes?: string;
      sortOrder?: number;
    },
  ) {
    return this.seating.createTableForVenue(body.eventId, body);
  }

  @Patch('ticketing/tables/:id')
  updateTable(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      capacity: number;
      section: string | null;
      active: boolean;
      notes: string | null;
      sortOrder: number;
    }>,
  ) {
    return this.seating.updateTableForVenue(id, body);
  }

  @Get('ticketing/seats')
  listSeats(@Query('eventId') eventId: string, @Query('tableId') tableId?: string) {
    return this.seating.listSeatsForVenue(eventId, tableId);
  }

  @Post('ticketing/seats')
  createSeat(
    @Body()
    body: {
      eventId: string;
      seatLabel: string;
      tableId?: string | null;
      section?: string;
      rowLabel?: string;
      sortOrder?: number;
    },
  ) {
    return this.seating.createSeatForVenue(body.eventId, body);
  }

  @Patch('ticketing/tickets/:id/seating')
  assignTicketSeating(
    @Param('id') id: string,
    @Body() body: { tableId?: string | null; seatId?: string | null },
  ) {
    return this.seating.assignTicketSeatingForVenue(id, body);
  }

  @Get('ticketing/reports/overview')
  ticketReportOverview(@Query() query: Record<string, string | undefined>) {
    return this.ticketReports.getOverviewForVenue(this.parseTicketReportQuery(query));
  }

  @Get('ticketing/reports/sales')
  ticketReportSales(@Query() query: Record<string, string | undefined>) {
    return this.ticketReports.getSalesForVenue(this.parseTicketReportQuery(query));
  }

  @Get('ticketing/reports/complimentary')
  ticketReportComplimentary(@Query() query: Record<string, string | undefined>) {
    return this.ticketReports.getComplimentaryForVenue(this.parseTicketReportQuery(query));
  }

  @Get('ticketing/reports/capacity')
  ticketReportCapacity(@Query() query: Record<string, string | undefined>) {
    return this.ticketReports.getCapacityForVenue(this.parseTicketReportQuery(query));
  }

  @Get('ticketing/reports/checkin')
  ticketReportCheckin(@Query() query: Record<string, string | undefined>) {
    return this.ticketReports.getCheckinForVenue(this.parseTicketReportQuery(query));
  }

  @Get('ticketing/reports/tickets')
  ticketReportTickets(@Query() query: Record<string, string | undefined>) {
    return this.ticketReports.getTicketsPerformanceForVenue(this.parseTicketReportQuery(query));
  }

  @Get('ticketing/reports/seating')
  ticketReportSeating(@Query() query: Record<string, string | undefined>) {
    return this.ticketReports.getSeatingForVenue(this.parseTicketReportQuery(query));
  }

  /** BCH Bar — catálogo (Fase 4.1) */
  @Get('bar/locations')
  async listBarLocations() {
    const tenantId = await this.bchTenantId();
    return this.bar.listLocations(tenantId);
  }

  @Get('bar/products')
  async listBarProducts() {
    const tenantId = await this.bchTenantId();
    return this.bar.listProducts(tenantId);
  }

  @Get('bar/products/:id')
  async getBarProduct(@Param('id') id: string) {
    const tenantId = await this.bchTenantId();
    return this.bar.getProduct(tenantId, id);
  }

  @Post('bar/products')
  async createBarProduct(
    @Body()
    body: {
      sku?: string;
      name?: string;
      category?: string;
      description?: string;
      imageUrl?: string;
      active?: boolean;
      physicalUnit?: {
        unitType?: string;
        label?: string;
        volumeMl?: number;
        quantityBasis?: number | string;
      };
    },
  ) {
    const tenantId = await this.bchTenantId();
    if (!body.physicalUnit?.unitType) throw new BadRequestException('Unidade física obrigatória.');
    return this.bar.createProduct(tenantId, {
      sku: body.sku ?? '',
      name: body.name ?? '',
      category: body.category ?? 'other',
      description: body.description,
      imageUrl: body.imageUrl,
      active: body.active,
      physicalUnit: {
        unitType: body.physicalUnit.unitType,
        label: body.physicalUnit.label,
        volumeMl: body.physicalUnit.volumeMl,
        quantityBasis: body.physicalUnit.quantityBasis,
      },
    });
  }

  @Patch('bar/products/:id')
  async updateBarProduct(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      sku: string;
      name: string;
      category: string;
      description: string | null;
      imageUrl: string | null;
      active: boolean;
      physicalUnit: {
        unitType: string;
        label?: string | null;
        volumeMl?: number | null;
        quantityBasis?: number | string;
      };
    }>,
  ) {
    const tenantId = await this.bchTenantId();
    return this.bar.updateProduct(tenantId, id, body);
  }

  @Get('bar/selling-units')
  async listBarSellingUnits(@Query('productId') productId?: string) {
    const tenantId = await this.bchTenantId();
    return this.bar.listSellingUnits(tenantId, productId?.trim() || undefined);
  }

  @Post('bar/products/:productId/selling-units')
  async createBarSellingUnit(
    @Param('productId') productId: string,
    @Body()
    body: {
      name?: string;
      active?: boolean;
      sortOrder?: number;
      portionAmount?: number | string | null;
      portionUnit?: string | null;
      physicalUnitsConsumedPerSale?: number | string;
      expectedPortionsPerPhysical?: number | string | null;
    },
  ) {
    const tenantId = await this.bchTenantId();
    if (!body.physicalUnitsConsumedPerSale) {
      throw new BadRequestException('Consumo de unidade física por venda é obrigatório.');
    }
    return this.bar.createSellingUnit(tenantId, productId, {
      name: body.name ?? '',
      active: body.active,
      sortOrder: body.sortOrder,
      portionAmount: body.portionAmount,
      portionUnit: body.portionUnit,
      physicalUnitsConsumedPerSale: body.physicalUnitsConsumedPerSale,
      expectedPortionsPerPhysical: body.expectedPortionsPerPhysical,
    });
  }

  @Patch('bar/selling-units/:id')
  async updateBarSellingUnit(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      name: string;
      active: boolean;
      sortOrder: number;
      portionAmount: number | string | null;
      portionUnit: string | null;
      physicalUnitsConsumedPerSale: number | string;
      expectedPortionsPerPhysical: number | string | null;
    }>,
  ) {
    const tenantId = await this.bchTenantId();
    return this.bar.updateSellingUnit(tenantId, id, body);
  }

  @Get('bar/prices')
  async listBarPrices(@Query('sellingUnitId') sellingUnitId?: string) {
    const tenantId = await this.bchTenantId();
    return this.bar.listPrices(tenantId, sellingUnitId?.trim() || undefined);
  }

  @Post('bar/selling-units/:sellingUnitId/prices')
  async createBarPrice(
    @Param('sellingUnitId') sellingUnitId: string,
    @Body()
    body: {
      price?: number | string;
      currency?: string;
      active?: boolean;
      validFrom?: string | null;
      validTo?: string | null;
    },
  ) {
    const tenantId = await this.bchTenantId();
    if (body.price == null || !body.currency) {
      throw new BadRequestException('Preço e moeda são obrigatórios.');
    }
    return this.bar.createPrice(tenantId, sellingUnitId, {
      price: body.price,
      currency: body.currency,
      active: body.active,
      validFrom: body.validFrom,
      validTo: body.validTo,
    });
  }

  @Patch('bar/prices/:id')
  async updateBarPrice(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      price: number | string;
      currency: string;
      active: boolean;
      validFrom: string | null;
      validTo: string | null;
    }>,
  ) {
    const tenantId = await this.bchTenantId();
    return this.bar.updatePrice(tenantId, id, body);
  }

  @Get('bar/inventory')
  async listBarInventory(@Query('locationId') locationId?: string) {
    const tenantId = await this.bchTenantId();
    return this.barStock.listStockBalances(tenantId, locationId?.trim() || undefined);
  }

  @Get('bar/inventory/movements')
  async listBarInventoryMovements(
    @Query('productId') productId?: string,
    @Query('locationId') locationId?: string,
    @Query('movementType') movementType?: string,
    @Query('eventId') eventId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = await this.bchTenantId();
    return this.barStock.listMovements(tenantId, {
      productId: productId?.trim() || undefined,
      locationId: locationId?.trim() || undefined,
      movementType: movementType?.trim() || undefined,
      eventId: eventId?.trim() || undefined,
      from: from?.trim() || undefined,
      to: to?.trim() || undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
  }

  @Post('bar/inventory/movements')
  async createBarInventoryMovement(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body()
    body: {
      productId?: string;
      locationId?: string;
      movementType?: string;
      direction?: string;
      quantity?: number | string;
      eventId?: string | null;
      referenceType?: string | null;
      referenceId?: string | null;
      sourceKey?: string | null;
      reason?: string | null;
      notes?: string | null;
    },
  ) {
    const tenantId = await this.bchTenantId();
    if (!body.productId || !body.locationId || !body.movementType || !body.direction || body.quantity == null) {
      throw new BadRequestException('productId, locationId, movementType, direction e quantity são obrigatórios.');
    }
    const operatorUserId = await this.tenantAccess.resolveInternalUserId(req.user.sub);
    return this.barStock.createManualMovement(tenantId, operatorUserId, {
      productId: body.productId,
      locationId: body.locationId,
      movementType: body.movementType,
      direction: body.direction,
      quantity: body.quantity,
      eventId: body.eventId,
      referenceType: body.referenceType,
      referenceId: body.referenceId,
      sourceKey: body.sourceKey,
      reason: body.reason,
      notes: body.notes,
    });
  }

  @Post('bar/inventory/adjust')
  async adjustBarInventory(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body()
    body: {
      productId?: string;
      locationId?: string;
      targetQuantity?: number | string;
      adjustmentKind?: string;
      reason?: string | null;
      notes?: string | null;
    },
  ) {
    const tenantId = await this.bchTenantId();
    if (!body.productId || !body.locationId || body.targetQuantity == null) {
      throw new BadRequestException('productId, locationId e targetQuantity são obrigatórios.');
    }
    const operatorUserId = await this.tenantAccess.resolveInternalUserId(req.user.sub);
    return this.barStock.adjustStockToTarget(tenantId, operatorUserId, {
      productId: body.productId,
      locationId: body.locationId,
      targetQuantity: body.targetQuantity,
      adjustmentKind: body.adjustmentKind,
      reason: body.reason,
      notes: body.notes,
    });
  }

  @Post('bar/inventory/transfer')
  async transferBarInventory(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body()
    body: {
      productId?: string;
      fromLocationId?: string;
      toLocationId?: string;
      quantity?: number | string;
      eventId?: string | null;
      sourceKey?: string | null;
      notes?: string | null;
    },
  ) {
    const tenantId = await this.bchTenantId();
    if (!body.productId || !body.fromLocationId || !body.toLocationId || body.quantity == null) {
      throw new BadRequestException(
        'productId, fromLocationId, toLocationId e quantity são obrigatórios.',
      );
    }
    const operatorUserId = await this.tenantAccess.resolveInternalUserId(req.user.sub);
    return this.barStock.transferStock(tenantId, operatorUserId, {
      productId: body.productId,
      fromLocationId: body.fromLocationId,
      toLocationId: body.toLocationId,
      quantity: body.quantity,
      eventId: body.eventId,
      sourceKey: body.sourceKey,
      notes: body.notes,
    });
  }

  @Get('bar/open-containers')
  async listBarOpenContainers(
    @Query('productId') productId?: string,
    @Query('locationId') locationId?: string,
    @Query('status') status?: string,
  ) {
    const tenantId = await this.bchTenantId();
    return this.barOpen.listOpenContainers(tenantId, {
      productId: productId?.trim() || undefined,
      locationId: locationId?.trim() || undefined,
      status: status?.trim() || undefined,
    });
  }

  @Post('bar/open-containers/open')
  async openBarContainer(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body()
    body: { productId?: string; locationId?: string; eventId?: string | null; notes?: string | null },
  ) {
    const tenantId = await this.bchTenantId();
    if (!body.productId || !body.locationId) {
      throw new BadRequestException('productId e locationId são obrigatórios.');
    }
    const operatorUserId = await this.tenantAccess.resolveInternalUserId(req.user.sub);
    return this.barOpen.openContainer(tenantId, operatorUserId, {
      productId: body.productId,
      locationId: body.locationId,
      eventId: body.eventId,
      notes: body.notes,
    });
  }

  @Get('bar/open-containers/:id/history')
  async listBarOpenContainerHistory(@Param('id') id: string) {
    const tenantId = await this.bchTenantId();
    return this.barOpen.listContainerHistory(tenantId, id);
  }

  @Post('bar/open-containers/:id/discard')
  async discardBarOpenContainer(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: { notes?: string | null },
  ) {
    const tenantId = await this.bchTenantId();
    const operatorUserId = await this.tenantAccess.resolveInternalUserId(req.user.sub);
    return this.barOpen.discardRemaining(tenantId, operatorUserId, id, body);
  }

  @Post('bar/open-containers/:id/adjust')
  async adjustBarOpenContainer(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: { newRemaining?: number | string; reason?: string | null },
  ) {
    const tenantId = await this.bchTenantId();
    if (body.newRemaining == null) throw new BadRequestException('newRemaining é obrigatório.');
    const operatorUserId = await this.tenantAccess.resolveInternalUserId(req.user.sub);
    return this.barOpen.adjustContainerContent(tenantId, operatorUserId, id, {
      newRemaining: body.newRemaining,
      reason: body.reason,
    });
  }

  @Post('bar/selling-units/:sellingUnitId/consume')
  async consumeBarSellingUnit(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('sellingUnitId') sellingUnitId: string,
    @Body()
    body: {
      locationId?: string;
      consumptionType?: string;
      eventId?: string | null;
      sourceKey?: string | null;
      portions?: number | string;
    },
  ) {
    const tenantId = await this.bchTenantId();
    if (!body.locationId) throw new BadRequestException('locationId é obrigatório.');
    const operatorUserId = await this.tenantAccess.resolveInternalUserId(req.user.sub);
    return this.barOpen.consumeSellingUnit(tenantId, operatorUserId, {
      sellingUnitId,
      locationId: body.locationId,
      consumptionType: body.consumptionType,
      eventId: body.eventId,
      sourceKey: body.sourceKey,
      portions: body.portions,
    });
  }

  @Get('bar/selling-units/:sellingUnitId/availability')
  async getBarSellingUnitAvailability(
    @Param('sellingUnitId') sellingUnitId: string,
    @Query('locationId') locationId?: string,
  ) {
    const tenantId = await this.bchTenantId();
    if (!locationId?.trim()) throw new BadRequestException('locationId é obrigatório.');
    return this.barOpen.getSellingUnitAvailability(tenantId, sellingUnitId, locationId.trim());
  }

  /** BCH Bar — POS (Fase 4.4) */
  @Get('bar/pos/catalog')
  async getBarPosCatalog(@Query('locationId') locationId?: string) {
    const tenantId = await this.bchTenantId();
    return this.barPos.getPosCatalog(tenantId, locationId);
  }

  @Get('bar/pos/sales')
  async listBarPosSales(
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('locationId') locationId?: string,
  ) {
    const tenantId = await this.bchTenantId();
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    return this.barPos.listSales(tenantId, {
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      status,
      locationId,
    });
  }

  @Post('bar/pos/sales')
  async createBarPosSale(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body()
    body: {
      locationId?: string;
      eventId?: string | null;
      terminalLabel?: string | null;
      notes?: string | null;
    },
  ) {
    const tenantId = await this.bchTenantId();
    if (!body.locationId?.trim()) throw new BadRequestException('locationId é obrigatório.');
    const operatorUserId = await this.tenantAccess.resolveInternalUserId(req.user.sub);
    return this.barPos.createSale(tenantId, operatorUserId, {
      locationId: body.locationId.trim(),
      eventId: body.eventId,
      terminalLabel: body.terminalLabel,
      notes: body.notes,
    });
  }

  @Get('bar/pos/sales/:id')
  async getBarPosSale(@Param('id') id: string) {
    const tenantId = await this.bchTenantId();
    return this.barPos.getSale(tenantId, id);
  }

  @Post('bar/pos/sales/:id/items')
  async addBarPosSaleItem(
    @Param('id') id: string,
    @Body()
    body: {
      sellingUnitId?: string;
      quantity?: number | string;
      lineDiscount?: number | string;
      unitPrice?: number | string;
      lineTotal?: number | string;
    },
  ) {
    const tenantId = await this.bchTenantId();
    if (!body.sellingUnitId?.trim()) throw new BadRequestException('sellingUnitId é obrigatório.');
    if (body.quantity == null) throw new BadRequestException('quantity é obrigatório.');
    return this.barPos.addSaleItem(tenantId, id, {
      sellingUnitId: body.sellingUnitId.trim(),
      quantity: body.quantity,
      lineDiscount: body.lineDiscount,
      unitPrice: body.unitPrice,
      lineTotal: body.lineTotal,
    });
  }

  @Patch('bar/pos/sales/:id/items/:itemId')
  async updateBarPosSaleItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body()
    body: { quantity?: number | string; lineDiscount?: number | string; unitPrice?: number | string },
  ) {
    const tenantId = await this.bchTenantId();
    return this.barPos.updateSaleItem(tenantId, id, itemId, body);
  }

  @Delete('bar/pos/sales/:id/items/:itemId')
  async removeBarPosSaleItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    const tenantId = await this.bchTenantId();
    return this.barPos.removeSaleItem(tenantId, id, itemId);
  }

  @Post('bar/pos/sales/:id/payments')
  async addBarPosSalePayment(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body()
    body: {
      method?: string;
      amount?: number | string;
      reference?: string | null;
      amountReceived?: number | string | null;
      changeDue?: number | string | null;
    },
  ) {
    const tenantId = await this.bchTenantId();
    if (!body.method?.trim()) throw new BadRequestException('method é obrigatório.');
    if (body.amount == null) throw new BadRequestException('amount é obrigatório.');
    const operatorUserId = await this.tenantAccess.resolveInternalUserId(req.user.sub);
    return this.barPos.addPayment(tenantId, id, operatorUserId, {
      method: body.method.trim(),
      amount: body.amount,
      reference: body.reference,
      amountReceived: body.amountReceived,
      changeDue: body.changeDue,
    });
  }

  @Delete('bar/pos/sales/:id/payments/:paymentId')
  async removeBarPosSalePayment(
    @Param('id') id: string,
    @Param('paymentId') paymentId: string,
  ) {
    const tenantId = await this.bchTenantId();
    return this.barPos.removePayment(tenantId, id, paymentId);
  }

  @Post('bar/pos/sales/:id/complete')
  async completeBarPosSale(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const tenantId = await this.bchTenantId();
    const operatorUserId = await this.tenantAccess.resolveInternalUserId(req.user.sub);
    return this.barPos.completeSale(tenantId, id, operatorUserId);
  }

  @Post('bar/pos/sales/:id/cancel')
  async cancelBarPosSale(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const tenantId = await this.bchTenantId();
    const operatorUserId = await this.tenantAccess.resolveInternalUserId(req.user.sub);
    return this.barPos.cancelOpenSale(tenantId, id, operatorUserId);
  }

  /** BCH Bar — estoque de evento (Fase 4.5) */
  @Get('bar/event-inventories')
  async listBarEventInventories(
    @Query('eventId') eventId?: string,
    @Query('status') status?: string,
  ) {
    const tenantId = await this.bchTenantId();
    return this.barEventInventory.listEventInventories(tenantId, { eventId, status });
  }

  @Post('bar/event-inventories')
  async openBarEventInventory(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() body: { eventId?: string; notes?: string | null },
  ) {
    const tenantId = await this.bchTenantId();
    if (!body.eventId?.trim()) throw new BadRequestException('eventId é obrigatório.');
    const operatorUserId = await this.tenantAccess.resolveInternalUserId(req.user.sub);
    return this.barEventInventory.openEventInventory(tenantId, operatorUserId, {
      eventId: body.eventId.trim(),
      notes: body.notes,
    });
  }

  @Get('bar/event-inventories/:id')
  async getBarEventInventory(@Param('id') id: string) {
    const tenantId = await this.bchTenantId();
    return this.barEventInventory.getEventInventory(tenantId, id);
  }

  @Get('bar/event-inventories/:id/summary')
  async getBarEventInventorySummary(@Param('id') id: string) {
    const tenantId = await this.bchTenantId();
    return this.barEventInventory.getSummary(tenantId, id);
  }

  @Post('bar/event-inventories/:id/allocate')
  async allocateBarEventInventory(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body()
    body: {
      lines?: Array<{ productId: string; quantity: number | string; sourceKey?: string | null }>;
      batchSourceKey?: string | null;
      notes?: string | null;
    },
  ) {
    const tenantId = await this.bchTenantId();
    if (!body.lines?.length) throw new BadRequestException('lines é obrigatório.');
    const operatorUserId = await this.tenantAccess.resolveInternalUserId(req.user.sub);
    return this.barEventInventory.allocateInitial(tenantId, operatorUserId, id, {
      lines: body.lines,
      batchSourceKey: body.batchSourceKey,
      notes: body.notes,
    });
  }

  @Post('bar/event-inventories/:id/replenish')
  async replenishBarEventInventory(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body()
    body: {
      lines?: Array<{ productId: string; quantity: number | string; sourceKey?: string | null }>;
      batchSourceKey?: string | null;
      notes?: string | null;
    },
  ) {
    const tenantId = await this.bchTenantId();
    if (!body.lines?.length) throw new BadRequestException('lines é obrigatório.');
    const operatorUserId = await this.tenantAccess.resolveInternalUserId(req.user.sub);
    return this.barEventInventory.replenish(tenantId, operatorUserId, id, {
      lines: body.lines,
      batchSourceKey: body.batchSourceKey,
      notes: body.notes,
    });
  }

  @Post('bar/event-inventories/:id/return')
  async returnBarEventInventory(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body()
    body: {
      lines?: Array<{ productId: string; quantity: number | string; sourceKey?: string | null }>;
      batchSourceKey?: string | null;
      notes?: string | null;
    },
  ) {
    const tenantId = await this.bchTenantId();
    if (!body.lines?.length) throw new BadRequestException('lines é obrigatório.');
    const operatorUserId = await this.tenantAccess.resolveInternalUserId(req.user.sub);
    return this.barEventInventory.returnClosedStock(tenantId, operatorUserId, id, {
      lines: body.lines,
      batchSourceKey: body.batchSourceKey,
      notes: body.notes,
    });
  }

  @Post('bar/event-inventories/:id/close')
  async closeBarEventInventory(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const tenantId = await this.bchTenantId();
    const operatorUserId = await this.tenantAccess.resolveInternalUserId(req.user.sub);
    return this.barEventInventory.closeEventInventory(tenantId, operatorUserId, id);
  }

  @Post('bar/inventory/movements/:id/reverse')
  async reverseBarInventoryMovement(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: { notes?: string | null },
  ) {
    const tenantId = await this.bchTenantId();
    const operatorUserId = await this.tenantAccess.resolveInternalUserId(req.user.sub);
    return this.barStock.reverseMovement(tenantId, operatorUserId, id, body.notes);
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
