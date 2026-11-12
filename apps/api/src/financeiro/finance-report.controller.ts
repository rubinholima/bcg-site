import { BadRequestException, Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireFinance, RequireModule } from '../auth/require-module.decorator';
import { TenantAccessService } from '../auth/tenant-access.service';
import { FinanceCapabilityGuard } from './finance-capability.guard';
import { FinanceReportService } from './finance-report.service';
@Controller('financeiro/relatorios')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard, FinanceCapabilityGuard)
@RequireModule('adm_financeiro')
export class FinanceReportController {
  constructor(
    private readonly reports: FinanceReportService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private roleFrom(req: Request & { user: CognitoJwtPayload }) {
    return req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
  }

  private async resolveTenantIds(
    req: Request & { user: CognitoJwtPayload },
    tenantId?: string,
    tenantIdsCsv?: string,
  ): Promise<string[]> {
    const allowed = await this.tenantAccess.getAllowedTenantIds(req.user.sub, this.roleFrom(req));
    if (tenantIdsCsv?.trim()) {
      const ids = tenantIdsCsv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      for (const id of ids) this.tenantAccess.assertCanAccessTenant(allowed, id);
      if (ids.length === 0) throw new BadRequestException('Informe ao menos uma empresa.');
      return ids;
    }
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório.');
    const tid = tenantId.trim();
    this.tenantAccess.assertCanAccessTenant(allowed, tid);
    return [tid];
  }

  private filtersFrom(req: Request & { user: CognitoJwtPayload }, query: Record<string, string | undefined>) {
    return async () => {
      const tenantIds = await this.resolveTenantIds(
        req,
        query.tenantId,
        query.tenantIds,
      );
      return this.reports.parseFilters(query, tenantIds);
    };
  }

  @Get('resumo')
  @RequireFinance('finance_reports_view')
  async resumo(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query() query: Record<string, string | undefined>,
  ) {
    const filters = await this.filtersFrom(req, query)();
    return this.reports.getSummary(filters);
  }

  @Get('simples')
  @RequireFinance('finance_reports_view')
  async simples(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query() query: Record<string, string | undefined>,
  ) {
    const filters = await this.filtersFrom(req, query)();
    return this.reports.getSimple(filters);
  }

  @Get('detalhado')
  @RequireFinance('finance_reports_view')
  async detalhado(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query() query: Record<string, string | undefined>,
  ) {
    const filters = await this.filtersFrom(req, query)();
    return this.reports.getDetailed(filters);
  }

  @Get('categorias')
  @RequireFinance('finance_reports_view')
  async categorias(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query() query: Record<string, string | undefined>,
  ) {
    const filters = await this.filtersFrom(req, query)();
    return this.reports.getCategoryAnalysis(filters);
  }

  @Get('contas')
  @RequireFinance('finance_reports_view')
  async contas(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query() query: Record<string, string | undefined>,
  ) {
    const filters = await this.filtersFrom(req, query)();
    return this.reports.getAccountAnalysis(filters);
  }

  @Get('fornecedores')
  @RequireFinance('finance_reports_view')
  async fornecedores(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query() query: Record<string, string | undefined>,
  ) {
    const filters = await this.filtersFrom(req, query)();
    return this.reports.getSupplierAnalysis(filters);
  }

  @Get('conciliacao')
  @RequireFinance('finance_reports_view')
  async conciliacao(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query() query: Record<string, string | undefined>,
  ) {
    const filters = await this.filtersFrom(req, query)();
    return this.reports.getReconciliationReport(filters);
  }

  @Get('vencidos')
  @RequireFinance('finance_reports_view')
  async vencidos(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query() query: Record<string, string | undefined>,
  ) {
    const filters = await this.filtersFrom(req, query)();
    return this.reports.getOverdue(filters);
  }

  @Get('a-vencer')
  @RequireFinance('finance_reports_view')
  async aVencer(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query() query: Record<string, string | undefined>,
    @Query('days') days?: string,
  ) {
    const filters = await this.filtersFrom(req, query)();
    const d = Math.min(90, Math.max(1, parseInt(days ?? '30', 10) || 30));
    return this.reports.getUpcoming(filters, d);
  }

  @Get('transferencias')
  @RequireFinance('finance_reports_view')
  async transferencias(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query() query: Record<string, string | undefined>,
  ) {
    const filters = await this.filtersFrom(req, query)();
    return this.reports.getInternalTransfers(filters);
  }

  @Get('export/csv')
  @RequireFinance('finance_reports_export')
  async exportCsv(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query() query: Record<string, string | undefined>,
    @Res() res: Response,
  ) {
    const filters = await this.filtersFrom(req, query)();
    const csv = await this.reports.exportCsv(filters);
    const actorId = await this.tenantAccess.resolveInternalUserId(req.user.sub);
    await this.reports.logExport(filters.tenantIds[0], actorId, req.user.email ?? null, 'csv', {
      dateBasis: filters.dateBasis,
      view: filters.view,
      direction: filters.direction,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="financeiro-relatorio.csv"');
    res.send(csv);
  }

  @Get('export/dataset')
  @RequireFinance('finance_reports_export')
  async exportDataset(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query() query: Record<string, string | undefined>,
  ) {
    const filters = await this.filtersFrom(req, query)();
    const actorId = await this.tenantAccess.resolveInternalUserId(req.user.sub);
    await this.reports.logExport(filters.tenantIds[0], actorId, req.user.email ?? null, 'xlsx-dataset', {
      dateBasis: filters.dateBasis,
    });
    return this.reports.exportDataset(filters);
  }
}
