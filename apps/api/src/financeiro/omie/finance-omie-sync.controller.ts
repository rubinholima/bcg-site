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
import { JwtAuthGuard, CognitoJwtPayload } from '../../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../../auth/roles.guard';
import { ModuleAccessGuard } from '../../auth/module-access.guard';
import { RequireFinance, RequireModule } from '../../auth/require-module.decorator';
import { TenantAccessService } from '../../auth/tenant-access.service';
import { FinanceCapabilityGuard } from '../finance-capability.guard';
import { FinanceOmieConnectionService } from './finance-omie-connection.service';
import { FinanceOmieSyncService } from './finance-omie-sync.service';
import { FinanceOmieReconciliationService } from './finance-omie-reconciliation.service';
import type { FinanceOmieSyncType } from './finance-omie.types';

@Controller('financeiro/omie')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard, FinanceCapabilityGuard)
@RequireModule('adm_financeiro')
export class FinanceOmieSyncController {
  constructor(
    private readonly connection: FinanceOmieConnectionService,
    private readonly sync: FinanceOmieSyncService,
    private readonly reconciliation: FinanceOmieReconciliationService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private async requireTenant(req: Request & { user: CognitoJwtPayload }, tenantId?: string) {
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

  @Get('conexao')
  @RequireFinance('finance_omie_view')
  async connectionStatus(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    return this.connection.getConnectionStatus(tid);
  }

  @Get('sincronizacao/lotes')
  @RequireFinance('finance_omie_view')
  async syncBatches(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    return this.sync.listBatches(tid);
  }

  @Post('sincronizar')
  @RequireFinance('finance_omie_sync')
  async runSync(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body()
    body: { tenantId: string; syncType?: FinanceOmieSyncType; dateFrom?: string; dateTo?: string },
  ) {
    const tid = await this.requireTenant(req, body.tenantId);
    const actor = await this.actor(req);
    const syncType = body.syncType ?? 'both';
    if (!['ap', 'ar', 'both'].includes(syncType)) {
      throw new BadRequestException('syncType inválido.');
    }
    return this.sync.runSync(tid, {
      syncType,
      dateFrom: body.dateFrom,
      dateTo: body.dateTo,
      actorUserId: actor.userId,
      actorName: actor.name,
    });
  }

  @Get('espelhos')
  @RequireFinance('finance_omie_view')
  async mirrors(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('tituloTipo') tituloTipo?: string,
    @Query('state') state?: string,
    @Query('matchLevel') matchLevel?: string,
    @Query('page') page?: string,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    return this.reconciliation.listMirrors(tid, { tituloTipo, state, matchLevel }, page ? parseInt(page, 10) : 1);
  }

  @Get('espelhos/:mirrorId')
  @RequireFinance('finance_omie_view')
  async mirrorDetail(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('mirrorId') mirrorId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    return this.reconciliation.getMirrorDetail(tid, mirrorId);
  }

  @Get('reconciliacao/fila')
  @RequireFinance('finance_omie_view')
  async reconciliationQueue(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    const items = await this.reconciliation.listReconciliationQueue(tid);
    const enriched = await Promise.all(
      items.map(async (m) => {
        const detail = await this.reconciliation.getMirrorDetail(tid, m.id);
        return detail;
      }),
    );
    return enriched;
  }

  @Get('reconciliacao/resumo')
  @RequireFinance('finance_omie_view')
  async reconciliationSummary(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    return this.reconciliation.getSummary(tid);
  }

  @Post('reconciliacao/vincular')
  @RequireFinance('finance_omie_reconcile')
  async link(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body()
    body: { tenantId: string; mirrorId: string; financeiroLancamentoId: string; reason?: string },
  ) {
    const tid = await this.requireTenant(req, body.tenantId);
    const actor = await this.actor(req);
    return this.reconciliation.linkMirror(
      tid,
      body.mirrorId,
      body.financeiroLancamentoId,
      actor.userId,
      actor.name,
      body.reason,
    );
  }

  @Post('reconciliacao/manter-separado')
  @RequireFinance('finance_omie_reconcile')
  async keepSeparate(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body()
    body: { tenantId: string; mirrorId: string; financeiroLancamentoId?: string; reason?: string },
  ) {
    const tid = await this.requireTenant(req, body.tenantId);
    const actor = await this.actor(req);
    return this.reconciliation.keepSeparate(
      tid,
      body.mirrorId,
      body.financeiroLancamentoId ?? null,
      actor.userId,
      actor.name,
      body.reason,
    );
  }

  @Get('importacao/:batchId/cruzamento-omie')
  @RequireFinance('finance_omie_view')
  async importCrosscheck(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('batchId') batchId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    return this.reconciliation.importOmieCrosscheck(tid, batchId);
  }
}
