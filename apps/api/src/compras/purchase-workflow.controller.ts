import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule, RequireProcurement } from '../auth/require-module.decorator';
import { ProcurementCapabilityGuard } from './procurement-capability.guard';
import { CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { requestActor } from '../common/request-actor';
import { PurchaseWorkflowService } from './purchase-workflow.service';
import { PURCHASE_REQUISITION_REQUESTER_MODULES } from './purchase-requisition-access.util';
import { PurchaseQuoteInviteService } from './purchase-quote-invite.service';
import { WorkflowNotifyService } from './workflow-notify.service';

type AuthedRequest = Request & { user: CognitoJwtPayload };

@Controller('compras/workflow')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard, ProcurementCapabilityGuard)
export class PurchaseWorkflowController {
  constructor(
    private readonly workflow: PurchaseWorkflowService,
    private readonly quoteInvites: PurchaseQuoteInviteService,
    private readonly notify: WorkflowNotifyService,
  ) {}

  @Post('manual-quotations')
  @RequireModule('adm_compras')
  @RequireProcurement('manage_quotation')
  createManualQuotation(
    @Req() req: AuthedRequest,
    @Body()
    body: {
      tenantId: string;
      title: string;
      description?: string;
      quoteDeadline?: string;
      currency?: string;
      notes?: string;
      supplierIds?: string[];
      items: Array<{
        productId?: string;
        description: string;
        quantity: number;
        unit?: string;
        specification?: string;
      }>;
    },
  ) {
    const a = requestActor(req.user);
    return this.workflow.createManualQuotation({
      tenantId: body.tenantId,
      title: body.title,
      description: body.description,
      quoteDeadline: body.quoteDeadline,
      currency: body.currency,
      notes: body.notes,
      supplierIds: body.supplierIds,
      items: body.items.map((i) => ({
        productId: i.productId,
        description: i.specification?.trim()
          ? `${i.description} — ${i.specification.trim()}`
          : i.description,
        quantity: i.quantity,
        unit: i.unit,
      })),
      actor: { userId: a.userId, name: a.name, email: a.email ?? undefined },
    });
  }

  @Get('settings')
  @RequireModule(['adm_compras', 'adm_financeiro', 'configuracoes'])
  getSettings(@Query('tenantId') tenantId: string) {
    return this.workflow.getSettings(tenantId);
  }

  @Get('settings/all')
  @UseGuards(SuperAdminGuard)
  @RequireModule(['configuracoes'])
  listAllSettings() {
    return this.workflow.listAllSettings();
  }

  @Patch('settings')
  @RequireModule(['adm_compras', 'configuracoes'])
  upsertSettings(
    @Query('tenantId') tenantId: string,
    @Body()
    body: {
      approvalThresholdBrl?: number;
      minQuotes?: number;
      maxQuotes?: number;
      comprasNotifyEmail?: string | null;
      comprasNotifyPhone?: string | null;
      financeiroNotifyEmail?: string | null;
      financeiroNotifyPhone?: string | null;
      tiNotifyEmail?: string | null;
      tiNotifyPhone?: string | null;
      diretoriaNotifyEmail?: string | null;
      diretoriaNotifyPhone?: string | null;
    },
  ) {
    return this.workflow.upsertSettings(tenantId, body);
  }

  @Get('inbox-counts')
  @RequireModule(['adm_compras', 'adm_financeiro', 'diretoria', 'adm_ti'])
  inboxCounts(@Query('tenantId') tenantId?: string) {
    return this.notify.getInboxCounts(tenantId);
  }

  @Get('requisitions')
  @RequireModule(['adm_compras', 'adm_financeiro', 'diretoria', 'requisicoes', 'adm_ti'])
  listRequisitions(
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: string,
    @Query('requestType') requestType?: string,
    @Query('mine') mine?: string,
    @Req() req?: AuthedRequest,
  ) {
    return this.workflow.findAll({
      tenantId: tenantId?.trim() || undefined,
      status: status?.trim() || undefined,
      requestType: requestType?.trim() || undefined,
      requestedByUserId: mine === '1' || mine === 'true' ? req?.user.sub : undefined,
    });
  }

  @Get('requisitions/:id')
  @RequireModule(['adm_compras', 'adm_financeiro', 'diretoria', 'requisicoes', 'adm_ti'])
  getRequisition(@Param('id') id: string) {
    return this.workflow.findRequisition(id);
  }

  @Get('approvals/pending')
  @RequireModule(['adm_financeiro', 'diretoria', 'futebol_logistica', 'requisicoes'])
  pendingApprovals(@Query('tenantId') tenantId?: string, @Query('role') role?: string) {
    const r =
      role === 'diretoria'
        ? 'diretoria'
        : role === 'gerente'
          ? 'gerente'
          : 'financeiro';
    return this.workflow.findPendingApprovals(r, tenantId?.trim() || undefined);
  }

  @Post('requisitions/:id/submit')
  @RequireModule(['requisicoes', 'adm_compras', 'adm_ti'])
  submit(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.workflow.submitRequisition(id, req.user.sub);
  }

  @Patch('requisitions/:id/status')
  @RequireModule('adm_compras')
  setStatus(
    @Param('id') id: string,
    @Body() body: { status: string; reason?: string },
    @Req() req: AuthedRequest,
  ) {
    return this.workflow.setStatusByCompras(id, body.status, requestActor(req.user), body.reason);
  }

  @Post('requisitions/:id/start-quotation')
  @RequireModule('adm_compras')
  startQuotation(@Param('id') id: string) {
    return this.workflow.startQuotation(id);
  }

  @Post('requisitions/:id/quote-invites')
  @RequireModule('adm_compras')
  createQuoteInvites(
    @Param('id') id: string,
    @Body() body: { supplierIds: string[]; expiresInDays?: number; sendEmail?: boolean },
  ) {
    return this.quoteInvites.createInvites(id, body);
  }

  @Get('requisitions/:id/quote-invites')
  @RequireModule('adm_compras')
  listQuoteInvites(@Param('id') id: string) {
    return this.quoteInvites.listInvites(id);
  }

  @Delete('requisitions/:id/quote-invites/:inviteId')
  @RequireModule('adm_compras')
  cancelQuoteInvite(@Param('id') id: string, @Param('inviteId') inviteId: string) {
    return this.quoteInvites.cancelInvite(id, inviteId);
  }

  @Post('requisitions/:id/quote-invites/:inviteId/send-email')
  @RequireModule('adm_compras')
  resendQuoteInviteEmail(@Param('id') id: string, @Param('inviteId') inviteId: string) {
    return this.quoteInvites.resendInviteEmail(id, inviteId);
  }

  @Post('requisitions/:id/quote-invites/:inviteId/renew')
  @RequireModule('adm_compras')
  renewQuoteInvite(
    @Param('id') id: string,
    @Param('inviteId') inviteId: string,
    @Body() body: { expiresInDays?: number },
  ) {
    return this.quoteInvites.renewInvite(id, inviteId, body.expiresInDays);
  }

  @Get('requisitions/:id/quote-comparison')
  @RequireModule('adm_compras')
  quoteComparison(@Param('id') id: string) {
    return this.quoteInvites.getComparison(id);
  }

  @Get('quotations/inbox-counts')
  @RequireModule('adm_compras')
  quotationInboxCounts(@Query('tenantId') tenantId?: string) {
    return this.workflow.quotationInboxCounts(tenantId?.trim() || undefined);
  }

  @Post('requisitions/:id/quotes')
  @RequireModule('adm_compras')
  @RequireProcurement('enter_quote')
  addQuote(
    @Param('id') id: string,
    @Body()
    body: {
      supplierId?: string;
      supplierName: string;
      items: Array<{
        description: string;
        quantity: number;
        unit?: string;
        unitPrice: number;
        tax?: number;
        shipping?: number;
        discount?: number;
      }>;
      totalAmount: number;
      deliveryDays?: number;
      notes?: string;
      attachmentUrl?: string;
      paymentTerms?: string;
      validUntil?: string;
      pricingBreakdown?: { tax?: number; shipping?: number; discount?: number; otherCosts?: number };
    },
  ) {
    return this.workflow.addQuote(id, body);
  }

  @Delete('requisitions/:id/quotes/:quoteId')
  @RequireModule('adm_compras')
  removeQuote(@Param('id') id: string, @Param('quoteId') quoteId: string) {
    return this.workflow.removeQuote(id, quoteId);
  }

  @Post('requisitions/:id/quotes/:quoteId/select')
  @RequireModule('adm_compras')
  @RequireProcurement('select_winner')
  selectQuote(
    @Param('id') id: string,
    @Param('quoteId') quoteId: string,
    @Body() body: { justification?: string },
    @Req() req: AuthedRequest,
  ) {
    return this.workflow.selectQuote(id, quoteId, body?.justification, {
      userId: req.user.sub,
      name: (req.user.name as string) ?? (req.user.email as string) ?? 'Usuário',
    });
  }

  @Post('requisitions/:id/submit-for-approval')
  @RequireModule('adm_compras')
  submitForApproval(@Param('id') id: string) {
    return this.workflow.submitForApproval(id);
  }

  @Post('requisitions/:id/approve')
  @RequireModule(['adm_financeiro', 'diretoria', 'futebol_logistica', 'requisicoes'])
  @RequireProcurement('approve_quotation')
  approve(
    @Param('id') id: string,
    @Body('role') role: 'gerente' | 'financeiro' | 'diretoria',
    @Body('notes') notes: string | undefined,
    @Req() req: AuthedRequest,
  ) {
    return this.workflow.approve(id, role, requestActor(req.user), notes);
  }

  @Post('requisitions/:id/reject')
  @RequireModule(['adm_financeiro', 'diretoria', 'futebol_logistica', 'requisicoes'])
  @RequireProcurement('approve_quotation')
  reject(
    @Param('id') id: string,
    @Body('role') role: 'gerente' | 'financeiro' | 'diretoria',
    @Body('reason') reason: string,
    @Req() req: AuthedRequest,
  ) {
    return this.workflow.reject(id, role, requestActor(req.user), reason);
  }

  @Post('requisitions/:id/create-order')
  @RequireModule('adm_compras')
  @RequireProcurement('manage_purchase_order')
  createOrder(@Param('id') id: string) {
    return this.workflow.createOrder(id);
  }

  @Post('requisitions/:id/receive')
  @RequireModule('adm_compras')
  receive(
    @Param('id') id: string,
    @Body()
    body: { receivedByName: string; assetCategoryId?: string; location?: string },
  ) {
    return this.workflow.receiveGoods(id, body);
  }

  @Post('requisitions/:id/send-receipt-signature')
  @RequireModule('adm_compras')
  sendReceiptSignature(
    @Param('id') id: string,
    @Body('signerEmail') signerEmail: string,
    @Body('signerName') signerName?: string,
  ) {
    return this.workflow.sendReceiptSignature(id, signerEmail, signerName);
  }

  @Post('requisitions/:id/sync-receipt')
  @RequireModule(['adm_compras', ...PURCHASE_REQUISITION_REQUESTER_MODULES])
  syncReceipt(@Param('id') id: string) {
    return this.workflow.syncReceiptSignature(id);
  }
}

@Controller('requisicoes')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule([...PURCHASE_REQUISITION_REQUESTER_MODULES])
export class MyRequisitionsController {
  constructor(private readonly workflow: PurchaseWorkflowService) {}

  @Get('mine')
  listMine(
    @Req() req: AuthedRequest,
    @Query('tenantId') tenantId?: string,
    @Query('requestType') requestType?: string,
  ) {
    return this.workflow.findAll({
      tenantId: tenantId?.trim() || undefined,
      requestedByUserId: req.user.sub,
      requestType: requestType?.trim() || undefined,
    });
  }

  @Post()
  create(
    @Req() req: AuthedRequest,
    @Body()
    body: {
      tenantId: string;
      requestType?: string;
      departmentName?: string;
      justification?: string;
      items: Array<{
        productId?: string;
        description: string;
        quantity: number;
        unit?: string;
        estimatedUnitPrice?: number;
        isPatrimonial?: boolean;
      }>;
      totalEstimated?: number;
      isPatrimonial?: boolean;
    },
  ) {
    const a = requestActor(req.user);
    return this.workflow.createRequisition({
      ...body,
      requestedByUserId: a.userId,
      requestedByName: a.name,
      requesterEmail: a.email ?? undefined,
    });
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
    @Body()
    body: {
      justification?: string;
      items?: Array<{
        productId?: string;
        description: string;
        quantity: number;
        unit?: string;
        estimatedUnitPrice?: number;
        isPatrimonial?: boolean;
      }>;
      totalEstimated?: number;
      isPatrimonial?: boolean;
      departmentName?: string;
    },
  ) {
    return this.workflow.updateRequisition(id, body, req.user.sub);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.workflow.submitRequisition(id, req.user.sub);
  }
}
