import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { TenantAccessService } from '../auth/tenant-access.service';
import { CreatePaymentProviderAccountDto } from './dto/create-payment-provider-account.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RecordManualPaymentDto } from './dto/record-manual-payment.dto';
import { PaymentCoreService } from './payment-core.service';
import { PaymentProviderAccountsService } from './payment-provider-accounts.service';
import type { PaymentMethod } from './payment-core.constants';

@Controller('payments/core')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('adm_financeiro')
export class PaymentsController {
  constructor(
    private readonly paymentCore: PaymentCoreService,
    private readonly providerAccounts: PaymentProviderAccountsService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private roleFrom(req: Request & { user: CognitoJwtPayload }) {
    return req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
  }

  private async requireTenantScope(
    req: Request & { user: CognitoJwtPayload },
    tenantIdRaw: string | undefined,
  ): Promise<string> {
    if (!tenantIdRaw?.trim()) {
      throw new BadRequestException('tenantId é obrigatório.');
    }
    const tenantId = tenantIdRaw.trim();
    const allowed = await this.tenantAccess.getAllowedTenantIds(req.user.sub, this.roleFrom(req));
    this.tenantAccess.assertCanAccessTenant(allowed, tenantId);
    return tenantId;
  }

  private async actorUserId(req: Request & { user: CognitoJwtPayload }) {
    return this.tenantAccess.resolveInternalUserId(req.user.sub);
  }

  @Get('payments')
  async listPayments(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId: string,
    @Query('limit') limit?: string,
  ) {
    const tid = await this.requireTenantScope(req, tenantId);
    const n = limit ? parseInt(limit, 10) : 50;
    return this.paymentCore.listPayments(tid, Number.isFinite(n) ? n : 50);
  }

  @Get('payments/:id')
  async getPayment(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    const tid = await this.requireTenantScope(req, tenantId);
    return this.paymentCore.getPayment(id, tid);
  }

  @Post('payments')
  async createPayment(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: CreatePaymentDto,
  ) {
    const tid = await this.requireTenantScope(req, dto.tenantId);
    const userId = await this.actorUserId(req);
    return this.paymentCore.createPayment({
      tenantId: tid,
      idempotencyKey: dto.idempotencyKey,
      amount: dto.amount,
      currency: dto.currency,
      eventTicketOrderId: dto.eventTicketOrderId,
      venueReceivableInstallmentId: dto.venueReceivableInstallmentId,
      paymentMethod: dto.paymentMethod as PaymentMethod | undefined,
      expiresAt: dto.expiresAt,
      paymentProviderAccountId: dto.paymentProviderAccountId,
      createdByUserId: userId,
    });
  }

  @Post('payments/:id/manual')
  async recordManual(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() dto: RecordManualPaymentDto,
  ) {
    const tid = await this.requireTenantScope(req, tenantId);
    const userId = await this.actorUserId(req);
    return this.paymentCore.recordManualPayment(id, tid, {
      paymentMethod: dto.paymentMethod as PaymentMethod,
      paidAt: dto.paidAt,
      manualReference: dto.manualReference,
      manualNotes: dto.manualNotes,
      externalProviderLabel: dto.externalProviderLabel,
      updatedByUserId: userId,
    });
  }

  @Get('provider-accounts')
  async listProviderAccounts(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId: string,
  ) {
    const tid = await this.requireTenantScope(req, tenantId);
    return this.providerAccounts.listByTenant(tid);
  }

  @Post('provider-accounts')
  async createProviderAccount(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: CreatePaymentProviderAccountDto,
  ) {
    const tid = await this.requireTenantScope(req, dto.tenantId);
    return this.providerAccounts.create({
      tenantId: tid,
      providerKey: dto.providerKey,
      country: dto.country,
      environment: dto.environment,
      enabledCurrencies: dto.enabledCurrencies,
      enabledMethods: dto.enabledMethods,
      active: dto.active,
      priority: dto.priority,
      merchantAccountId: dto.merchantAccountId,
      credentialsJson: dto.credentialsJson,
      webhookSecret: dto.webhookSecret,
    });
  }
}
