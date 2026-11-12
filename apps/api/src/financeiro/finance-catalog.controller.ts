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
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireFinance, RequireModule } from '../auth/require-module.decorator';
import { TenantAccessService } from '../auth/tenant-access.service';
import { FinanceCapabilityGuard } from './finance-capability.guard';
import { FinanceAccountsService } from './finance-accounts.service';
import { FinanceCategoriesService } from './finance-categories.service';
import { FinancePaymentMethodsService } from './finance-payment-methods.service';
import { SupplierPaymentDestinationsService } from './supplier-payment-destinations.service';
import { FinanceAccessService } from './finance-access.service';
import { FinanceDelegationService } from './finance-delegation.service';

@Controller('financeiro')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard, FinanceCapabilityGuard)
export class FinanceCatalogController {
  constructor(
    private readonly tenantAccess: TenantAccessService,
    private readonly accounts: FinanceAccountsService,
    private readonly categories: FinanceCategoriesService,
    private readonly paymentMethods: FinancePaymentMethodsService,
    private readonly supplierPayments: SupplierPaymentDestinationsService,
    private readonly financeAccess: FinanceAccessService,
    private readonly delegations: FinanceDelegationService,
  ) {}

  private async requireTenantScope(
    req: Request & { user: CognitoJwtPayload },
    tenantIdRaw: string | undefined,
  ): Promise<string> {
    if (!tenantIdRaw?.trim()) throw new BadRequestException('tenantId é obrigatório.');
    const tenantId = tenantIdRaw.trim();
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    const allowed = await this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
    this.tenantAccess.assertCanAccessTenant(allowed, tenantId);
    return tenantId;
  }

  private async internalUserId(req: Request & { user: CognitoJwtPayload }) {
    return this.tenantAccess.resolveInternalUserId(req.user.sub);
  }

  @Get('access/capabilities')
  @RequireModule(['adm_financeiro', 'finance_view'])
  async capabilities(@Req() req: Request & { user: CognitoJwtPayload }) {
    return this.financeAccess.capabilityMap(req.user);
  }

  @Get('contas')
  @RequireModule(['adm_financeiro', 'finance_view'])
  @RequireFinance('finance_view')
  async listAccounts(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const tid = await this.requireTenantScope(req, tenantId);
    return this.accounts.list(tid, activeOnly === '1' || activeOnly === 'true');
  }

  @Get('contas/:id/resumo')
  @RequireModule(['adm_financeiro', 'finance_view'])
  @RequireFinance('finance_view')
  async accountSummary(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
  ) {
    const tid = await this.requireTenantScope(req, tenantId);
    return this.accounts.summary(tid, id);
  }

  @Post('contas')
  @RequireModule(['adm_financeiro', 'finance_accounts_manage'])
  @RequireFinance('finance_accounts_manage')
  async createAccount(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() body: Record<string, unknown>,
  ) {
    const tid = await this.requireTenantScope(req, body.tenantId as string);
    return this.accounts.create(tid, body as never);
  }

  @Patch('contas/:id')
  @RequireModule(['adm_financeiro', 'finance_accounts_manage'])
  @RequireFinance('finance_accounts_manage')
  async updateAccount(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const tid = await this.requireTenantScope(req, body.tenantId as string);
    return this.accounts.update(tid, id, body as never);
  }

  @Get('categorias')
  @RequireModule(['adm_financeiro', 'finance_view'])
  @RequireFinance('finance_view')
  async listCategories(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const tid = await this.requireTenantScope(req, tenantId);
    return this.categories.list(tid, activeOnly === '1' || activeOnly === 'true');
  }

  @Post('categorias')
  @RequireModule(['adm_financeiro', 'finance_categories_manage'])
  @RequireFinance('finance_categories_manage')
  async createCategory(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() body: Record<string, unknown>,
  ) {
    const tid = await this.requireTenantScope(req, body.tenantId as string);
    return this.categories.create(tid, body as never);
  }

  @Patch('categorias/:id')
  @RequireModule(['adm_financeiro', 'finance_categories_manage'])
  @RequireFinance('finance_categories_manage')
  async updateCategory(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const tid = await this.requireTenantScope(req, body.tenantId as string);
    return this.categories.update(tid, id, body as never);
  }

  @Get('formas-pagamento')
  @RequireModule(['adm_financeiro', 'finance_view'])
  @RequireFinance('finance_view')
  async listPaymentMethods(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    const tid = await this.requireTenantScope(req, tenantId);
    return this.paymentMethods.list(tid, activeOnly === '1' || activeOnly === 'true');
  }

  @Post('formas-pagamento')
  @RequireModule(['adm_financeiro', 'finance_payment_methods_manage'])
  @RequireFinance('finance_payment_methods_manage')
  async createPaymentMethod(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() body: Record<string, unknown>,
  ) {
    const tid = await this.requireTenantScope(req, body.tenantId as string);
    return this.paymentMethods.create(tid, body as never);
  }

  @Patch('formas-pagamento/:id')
  @RequireModule(['adm_financeiro', 'finance_payment_methods_manage'])
  @RequireFinance('finance_payment_methods_manage')
  async updatePaymentMethod(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const tid = await this.requireTenantScope(req, body.tenantId as string);
    return this.paymentMethods.update(tid, id, body as never);
  }

  @Get('fornecedores/:supplierId/pagamentos')
  @RequireModule(['adm_financeiro', 'finance_view'])
  @RequireFinance('finance_view')
  async listSupplierDestinations(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId: string,
    @Param('supplierId') supplierId: string,
  ) {
    const tid = await this.requireTenantScope(req, tenantId);
    const caps = await this.financeAccess.capabilityMap(req.user);
    const reveal = caps.finance_bank_data_view;
    if (!reveal) await this.financeAccess.assertCapability(req.user, 'finance_view');
    return this.supplierPayments.listBySupplier(tid, supplierId, reveal);
  }

  @Post('fornecedores/:supplierId/pagamentos')
  @RequireModule(['adm_financeiro', 'finance_bank_data_manage'])
  @RequireFinance('finance_bank_data_manage')
  async createSupplierDestination(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('supplierId') supplierId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const tid = await this.requireTenantScope(req, body.tenantId as string);
    return this.supplierPayments.create(tid, supplierId, body as never);
  }

  @Get('delegacoes/todas')
  @RequireModule(['adm_financeiro', 'finance_approve'])
  @RequireFinance('finance_approve')
  async listAllDelegations(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId: string,
  ) {
    const tid = await this.requireTenantScope(req, tenantId);
    return this.delegations.listAll(tid);
  }

  @Get('delegacoes')
  @RequireModule(['adm_financeiro', 'finance_approve'])
  @RequireFinance('finance_approve')
  async listDelegations(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId: string,
    @Query('capability') capability?: string,
  ) {
    const tid = await this.requireTenantScope(req, tenantId);
    return this.delegations.listActive(tid, capability);
  }

  @Post('delegacoes')
  @RequireModule(['adm_financeiro', 'finance_approve'])
  @RequireFinance('finance_approve')
  async grantDelegation(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() body: Record<string, unknown>,
  ) {
    const tid = await this.requireTenantScope(req, body.tenantId as string);
    const grantedByUserId = (await this.internalUserId(req)) ?? req.user.sub;
    return this.delegations.grant(tid, {
      grantedByUserId,
      grantedToUserId: String(body.grantedToUserId ?? ''),
      capability: String(body.capability ?? 'finance_pay'),
      validFrom: body.validFrom as string | undefined,
      validUntil: body.validUntil as string | undefined,
      reason: body.reason as string | undefined,
    });
  }

  @Patch('delegacoes/:id/revogar')
  @RequireModule(['adm_financeiro', 'finance_approve'])
  @RequireFinance('finance_approve')
  async revokeDelegation(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    const tid = await this.requireTenantScope(req, tenantId);
    const revokedByUserId = (await this.internalUserId(req)) ?? req.user.sub;
    return this.delegations.revoke(tid, id, revokedByUserId);
  }
}
