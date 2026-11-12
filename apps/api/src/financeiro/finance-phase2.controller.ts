import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireFinance, RequireModule } from '../auth/require-module.decorator';
import { TenantAccessService } from '../auth/tenant-access.service';
import { FinanceCapabilityGuard } from './finance-capability.guard';
import { FinanceSettlementService } from './finance-settlement.service';
import { FinanceAllocationService } from './finance-allocation.service';
import { FinanceInstallmentService } from './finance-installment.service';
import { FinanceTransferService } from './finance-transfer.service';
import { FinanceDocumentService } from './finance-document.service';
import { FinanceReconciliationService } from './finance-reconciliation.service';
import { FinanceCardStatementService } from './finance-card-statement.service';
import { FinancePayrollDeductionService } from './finance-payroll-deduction.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('financeiro')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard, FinanceCapabilityGuard)
export class FinancePhase2Controller {
  constructor(
    private readonly tenantAccess: TenantAccessService,
    private readonly settlements: FinanceSettlementService,
    private readonly allocations: FinanceAllocationService,
    private readonly installments: FinanceInstallmentService,
    private readonly transfers: FinanceTransferService,
    private readonly documents: FinanceDocumentService,
    private readonly reconciliation: FinanceReconciliationService,
    private readonly cardStatements: FinanceCardStatementService,
    private readonly payrollDeduction: FinancePayrollDeductionService,
    private readonly prisma: PrismaService,
  ) {}

  private async requireTenant(
    req: Request & { user: CognitoJwtPayload },
    tenantId?: string,
  ): Promise<string> {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório.');
    const tid = tenantId.trim();
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    const allowed = await this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
    this.tenantAccess.assertCanAccessTenant(allowed, tid);
    return tid;
  }

  private async actor(req: Request & { user: CognitoJwtPayload }) {
    const userId = await this.tenantAccess.resolveInternalUserId(req.user.sub);
    return { userId: userId ?? req.user.sub, name: req.user.email ?? null };
  }

  @Post('baixas')
  @RequireModule(['adm_financeiro', 'finance_pay'])
  @RequireFinance('finance_pay')
  async createSettlement(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() body: Record<string, unknown>,
  ) {
    const tenantId = await this.requireTenant(req, String(body.tenantId ?? ''));
    const actor = await this.actor(req);
    return this.settlements.createSettlement(req.user, actor.userId, actor.name, {
      tenantId,
      financeiroLancamentoId: String(body.financeiroLancamentoId ?? ''),
      idempotencyKey: String(body.idempotencyKey ?? ''),
      settledAt: String(body.settledAt ?? new Date().toISOString()),
      amountSettled: Number(body.amountSettled),
      interestAmount: body.interestAmount != null ? Number(body.interestAmount) : undefined,
      penaltyAmount: body.penaltyAmount != null ? Number(body.penaltyAmount) : undefined,
      discountAmount: body.discountAmount != null ? Number(body.discountAmount) : undefined,
      abatementAmount: body.abatementAmount != null ? Number(body.abatementAmount) : undefined,
      otherAdjustmentAmount:
        body.otherAdjustmentAmount != null ? Number(body.otherAdjustmentAmount) : undefined,
      financePaymentMethodId: body.financePaymentMethodId
        ? String(body.financePaymentMethodId)
        : undefined,
      actualFinanceAccountId: String(body.actualFinanceAccountId ?? ''),
      manualSettlement: Boolean(body.manualSettlement),
      manualReason: body.manualReason ? String(body.manualReason) : undefined,
      accountOverrideReason: body.accountOverrideReason
        ? String(body.accountOverrideReason)
        : undefined,
      referenceNotes: body.referenceNotes ? String(body.referenceNotes) : undefined,
    });
  }

  @Get('lancamentos/:id/baixas')
  @RequireModule(['adm_financeiro', 'finance_view'])
  @RequireFinance('finance_view')
  async listSettlements(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    return this.settlements.listSettlements(tid, id);
  }

  @Get('filas/conta')
  @RequireModule(['adm_financeiro', 'finance_view'])
  @RequireFinance('finance_view')
  async queueByAccount(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId: string,
    @Query('financeAccountId') financeAccountId: string,
    @Query('tipo') tipo?: string,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    const t = tipo === 'receber' ? 'receber' : 'pagar';
    return this.settlements.pendingByPlannedAccount(tid, financeAccountId, t);
  }

  @Post('lancamentos/:id/rateio')
  @RequireModule(['adm_financeiro', 'finance_edit'])
  @RequireFinance('finance_edit')
  async saveAllocation(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: { tenantId: string; lines: Array<{ financeCategoryId?: string; description?: string; amount: number }> },
  ) {
    const tid = await this.requireTenant(req, body.tenantId);
    const actor = await this.actor(req);
    return this.allocations.replaceLines(tid, id, body.lines ?? [], actor.userId);
  }

  @Get('lancamentos/:id/rateio')
  @RequireModule(['adm_financeiro', 'finance_view'])
  @RequireFinance('finance_view')
  async getAllocation(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    return this.allocations.list(tid, id);
  }

  @Post('parcelas/gerar')
  @RequireModule(['adm_financeiro', 'finance_create'])
  @RequireFinance('finance_create')
  async generateInstallments(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() body: Record<string, unknown>,
  ) {
    const tenantId = await this.requireTenant(req, String(body.tenantId ?? ''));
    const actor = await this.actor(req);
    return this.installments.generate(
      tenantId,
      {
        tipo: body.tipo === 'receber' ? 'receber' : 'pagar',
        descricao: String(body.descricao ?? ''),
        totalAmount: Number(body.totalAmount),
        installmentCount: Number(body.installmentCount),
        firstDueDate: String(body.firstDueDate ?? ''),
        employeeId: body.employeeId ? String(body.employeeId) : undefined,
        idempotencyKey: String(body.idempotencyKey ?? ''),
        basePayload: body.basePayload as Record<string, unknown> | undefined,
      },
      actor.userId,
    );
  }

  @Patch('parcelas/:lancamentoId/vencimento')
  @RequireModule(['adm_financeiro', 'finance_edit'])
  @RequireFinance('finance_edit')
  async patchInstallmentDue(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('lancamentoId') lancamentoId: string,
    @Body() body: { tenantId: string; dueDate: string },
  ) {
    const tid = await this.requireTenant(req, body.tenantId);
    const actor = await this.actor(req);
    return this.installments.updateInstallmentDueDate(tid, lancamentoId, body.dueDate, actor.userId);
  }

  @Post('transferencias')
  @RequireModule(['adm_financeiro', 'finance_pay'])
  @RequireFinance('finance_pay')
  async createTransfer(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() body: Record<string, unknown>,
  ) {
    const tenantId = await this.requireTenant(req, String(body.tenantId ?? ''));
    const actor = await this.actor(req);
    return this.transfers.createInternalTransfer(
      tenantId,
      {
        sourceAccountId: String(body.sourceAccountId ?? ''),
        destAccountId: String(body.destAccountId ?? ''),
        amount: Number(body.amount),
        transferDate: String(body.transferDate ?? ''),
        description: body.description ? String(body.description) : undefined,
        idempotencyKey: String(body.idempotencyKey ?? ''),
      },
      actor.userId,
    );
  }

  @Post('lancamentos/:id/documentos')
  @RequireModule(['adm_financeiro', 'finance_edit'])
  @RequireFinance('finance_edit')
  async attachDocument(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const tenantId = await this.requireTenant(req, String(body.tenantId ?? ''));
    const actor = await this.actor(req);
    return this.documents.registerDocument(
      tenantId,
      id,
      {
        docType: String(body.docType ?? 'OTHER'),
        fileKey: String(body.fileKey ?? ''),
        fileName: String(body.fileName ?? ''),
        mimeType: body.mimeType ? String(body.mimeType) : undefined,
        notes: body.notes ? String(body.notes) : undefined,
      },
      actor.userId,
    );
  }

  @Get('lancamentos/:id/documentos')
  @RequireModule(['adm_financeiro', 'finance_view'])
  @RequireFinance('finance_view')
  async listDocuments(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    return this.documents.list(tid, id);
  }

  @Get('documentos/:documentId/download')
  @RequireModule(['adm_financeiro', 'finance_view'])
  @RequireFinance('finance_view')
  async downloadDocument(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('documentId') documentId: string,
    @Query('tenantId') tenantId: string,
    @Res() res: Response,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    const { stream, fileName, mimeType } = await this.documents.downloadStream(tid, documentId);
    res.setHeader('Content-Type', mimeType ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    stream.pipe(res);
  }

  @Post('lancamentos/:id/conciliacao')
  @RequireModule(['adm_financeiro', 'finance_edit'])
  @RequireFinance('finance_edit')
  async reconcile(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: { tenantId: string; notes?: string; status?: 'reconciled' | 'exception' },
  ) {
    const tid = await this.requireTenant(req, body.tenantId);
    const actor = await this.actor(req);
    return this.reconciliation.markReconciled(tid, id, body, actor.userId);
  }

  @Get('lancamentos/:id/timeline')
  @RequireModule(['adm_financeiro', 'finance_view'])
  @RequireFinance('finance_view')
  async timeline(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    return this.prisma.financeAuditEvent.findMany({
      where: { tenantId: tid, financeiroLancamentoId: id },
      orderBy: { createdAt: 'asc' },
    });
  }

  @Post('receber/:id/desconto-folha')
  @RequireModule(['adm_financeiro', 'finance_create'])
  @RequireFinance('finance_create')
  async schedulePayrollDeduction(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const tenantId = await this.requireTenant(req, String(body.tenantId ?? ''));
    const actor = await this.actor(req);
    return this.payrollDeduction.scheduleForReceivable(
      tenantId,
      id,
      {
        employmentId: String(body.employmentId ?? ''),
        employeeId: String(body.employeeId ?? ''),
        competenceMonth: String(body.competenceMonth ?? ''),
        idempotencyKey: String(body.idempotencyKey ?? ''),
        amount: Number(body.amount),
      },
      actor.userId,
    );
  }

  @Post('cartoes/faturas')
  @RequireModule(['adm_financeiro', 'finance_accounts_manage'])
  @RequireFinance('finance_accounts_manage')
  async createCardStatement(@Req() req: Request & { user: CognitoJwtPayload }, @Body() body: Record<string, unknown>) {
    const tenantId = await this.requireTenant(req, String(body.tenantId ?? ''));
    return this.cardStatements.createStatement(tenantId, {
      financeAccountId: String(body.financeAccountId ?? ''),
      periodStart: String(body.periodStart ?? ''),
      periodEnd: String(body.periodEnd ?? ''),
      dueDate: body.dueDate ? String(body.dueDate) : undefined,
    });
  }

  @Post('cartoes/faturas/:id/pagamento')
  @RequireModule(['adm_financeiro', 'finance_pay'])
  @RequireFinance('finance_pay')
  async payCardStatement(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const tenantId = await this.requireTenant(req, String(body.tenantId ?? ''));
    return this.cardStatements.payStatement(tenantId, id, {
      fromFinanceAccountId: String(body.fromFinanceAccountId ?? ''),
      amount: Number(body.amount),
      paidAt: String(body.paidAt ?? new Date().toISOString()),
      notes: body.notes ? String(body.notes) : undefined,
    });
  }
}
