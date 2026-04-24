import { BadRequestException, Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { TenantAccessService } from '../auth/tenant-access.service';
import {
  OmieService,
  type FinanceiroRelatorioFiltros,
  type FinanceiroTituloFiltro,
} from '../integrations/omie/omie.service';

function parsePositiveInt(value: string | undefined, fallback: number, max?: number): number {
  const n = parseInt(String(value ?? ''), 10);
  if (Number.isNaN(n) || n < 1) return fallback;
  if (max !== undefined) return Math.min(max, n);
  return n;
}

function parseFiltro(v: string | undefined): FinanceiroTituloFiltro {
  const x = (v ?? 'todos').trim();
  if (x === 'em_aberto' || x === 'pagos' || x === 'atrasados' || x === 'todos') return x;
  return 'todos';
}

function relatorioFiltrosFromQuery(q: {
  dataEmissaoDe?: string;
  dataEmissaoAte?: string;
  dataRegistroDe?: string;
  dataRegistroAte?: string;
  dataMovimentoDe?: string;
  dataMovimentoAte?: string;
  codigoClienteFornecedor?: string;
  cpfCnpj?: string;
  contaCorrenteId?: string;
}): FinanceiroRelatorioFiltros | undefined {
  const out: FinanceiroRelatorioFiltros = {};
  if (q.dataEmissaoDe?.trim()) out.dataEmissaoDe = q.dataEmissaoDe.trim();
  if (q.dataEmissaoAte?.trim()) out.dataEmissaoAte = q.dataEmissaoAte.trim();
  if (q.dataRegistroDe?.trim()) out.dataRegistroDe = q.dataRegistroDe.trim();
  if (q.dataRegistroAte?.trim()) out.dataRegistroAte = q.dataRegistroAte.trim();
  if (q.dataMovimentoDe?.trim()) out.dataMovimentoDe = q.dataMovimentoDe.trim();
  if (q.dataMovimentoAte?.trim()) out.dataMovimentoAte = q.dataMovimentoAte.trim();
  const ccf = parseInt(String(q.codigoClienteFornecedor ?? ''), 10);
  if (Number.isFinite(ccf) && ccf > 0) out.codigoClienteFornecedor = ccf;
  if (q.cpfCnpj?.trim()) out.cpfCnpj = q.cpfCnpj.trim();
  const cc = parseInt(String(q.contaCorrenteId ?? ''), 10);
  if (Number.isFinite(cc) && cc > 0) out.contaCorrenteId = cc;
  return Object.keys(out).length > 0 ? out : undefined;
}

@Controller('financeiro/omie')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class FinanceiroOmieController {
  constructor(
    private readonly omie: OmieService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private async requireTenantScope(
    req: Request & { user: CognitoJwtPayload },
    tenantIdRaw: string | undefined,
  ): Promise<string> {
    if (!tenantIdRaw?.trim()) {
      throw new BadRequestException('tenantId é obrigatório.');
    }
    const tenantId = tenantIdRaw.trim();
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    const allowed = await this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
    this.tenantAccess.assertCanAccessTenant(allowed, tenantId);
    return tenantId;
  }

  @Get('contas-receber/resumo')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_financeiro')
  async resumoContasReceber(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId: string,
    @Query('filtro') filtro?: string,
    @Query('busca') busca?: string,
    @Query('dataEmissaoDe') dataEmissaoDe?: string,
    @Query('dataEmissaoAte') dataEmissaoAte?: string,
    @Query('dataRegistroDe') dataRegistroDe?: string,
    @Query('dataRegistroAte') dataRegistroAte?: string,
    @Query('dataMovimentoDe') dataMovimentoDe?: string,
    @Query('dataMovimentoAte') dataMovimentoAte?: string,
    @Query('codigoClienteFornecedor') codigoClienteFornecedor?: string,
    @Query('cpfCnpj') cpfCnpj?: string,
    @Query('contaCorrenteId') contaCorrenteId?: string,
  ) {
    const tid = await this.requireTenantScope(req, tenantId);
    const filtrosRelatorio = relatorioFiltrosFromQuery({
      dataEmissaoDe,
      dataEmissaoAte,
      dataRegistroDe,
      dataRegistroAte,
      dataMovimentoDe,
      dataMovimentoAte,
      codigoClienteFornecedor,
      cpfCnpj,
      contaCorrenteId,
    });
    return this.omie.resumoContasReceber(tid, {
      filtro: parseFiltro(filtro),
      busca: busca?.trim() || undefined,
      filtrosRelatorio,
    });
  }

  @Get('contas-pagar/resumo')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_financeiro')
  async resumoContasPagar(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId: string,
    @Query('filtro') filtro?: string,
    @Query('busca') busca?: string,
    @Query('dataEmissaoDe') dataEmissaoDe?: string,
    @Query('dataEmissaoAte') dataEmissaoAte?: string,
    @Query('dataRegistroDe') dataRegistroDe?: string,
    @Query('dataRegistroAte') dataRegistroAte?: string,
    @Query('dataMovimentoDe') dataMovimentoDe?: string,
    @Query('dataMovimentoAte') dataMovimentoAte?: string,
    @Query('codigoClienteFornecedor') codigoClienteFornecedor?: string,
    @Query('cpfCnpj') cpfCnpj?: string,
    @Query('contaCorrenteId') contaCorrenteId?: string,
  ) {
    const tid = await this.requireTenantScope(req, tenantId);
    const filtrosRelatorio = relatorioFiltrosFromQuery({
      dataEmissaoDe,
      dataEmissaoAte,
      dataRegistroDe,
      dataRegistroAte,
      dataMovimentoDe,
      dataMovimentoAte,
      codigoClienteFornecedor,
      cpfCnpj,
      contaCorrenteId,
    });
    return this.omie.resumoContasPagar(tid, {
      filtro: parseFiltro(filtro),
      busca: busca?.trim() || undefined,
      filtrosRelatorio,
    });
  }

  @Get('contas-receber')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_financeiro')
  async listContasReceber(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId: string,
    @Query('pagina') pagina?: string,
    @Query('registros') registros?: string,
    @Query('filtro') filtro?: string,
    @Query('busca') busca?: string,
    @Query('dataEmissaoDe') dataEmissaoDe?: string,
    @Query('dataEmissaoAte') dataEmissaoAte?: string,
    @Query('dataRegistroDe') dataRegistroDe?: string,
    @Query('dataRegistroAte') dataRegistroAte?: string,
    @Query('dataMovimentoDe') dataMovimentoDe?: string,
    @Query('dataMovimentoAte') dataMovimentoAte?: string,
    @Query('codigoClienteFornecedor') codigoClienteFornecedor?: string,
    @Query('cpfCnpj') cpfCnpj?: string,
    @Query('contaCorrenteId') contaCorrenteId?: string,
  ) {
    const tid = await this.requireTenantScope(req, tenantId);
    const p = parsePositiveInt(pagina, 1);
    const r = parsePositiveInt(registros, 20, 100);
    const filtrosRelatorio = relatorioFiltrosFromQuery({
      dataEmissaoDe,
      dataEmissaoAte,
      dataRegistroDe,
      dataRegistroAte,
      dataMovimentoDe,
      dataMovimentoAte,
      codigoClienteFornecedor,
      cpfCnpj,
      contaCorrenteId,
    });
    return this.omie.listContasReceber(tid, {
      pagina: p,
      registrosPorPagina: r,
      filtro: parseFiltro(filtro),
      busca: busca?.trim() || undefined,
      filtrosRelatorio,
    });
  }

  @Get('contas-pagar')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_financeiro')
  async listContasPagar(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId: string,
    @Query('pagina') pagina?: string,
    @Query('registros') registros?: string,
    @Query('filtro') filtro?: string,
    @Query('busca') busca?: string,
    @Query('dataEmissaoDe') dataEmissaoDe?: string,
    @Query('dataEmissaoAte') dataEmissaoAte?: string,
    @Query('dataRegistroDe') dataRegistroDe?: string,
    @Query('dataRegistroAte') dataRegistroAte?: string,
    @Query('dataMovimentoDe') dataMovimentoDe?: string,
    @Query('dataMovimentoAte') dataMovimentoAte?: string,
    @Query('codigoClienteFornecedor') codigoClienteFornecedor?: string,
    @Query('cpfCnpj') cpfCnpj?: string,
    @Query('contaCorrenteId') contaCorrenteId?: string,
  ) {
    const tid = await this.requireTenantScope(req, tenantId);
    const p = parsePositiveInt(pagina, 1);
    const r = parsePositiveInt(registros, 20, 100);
    const filtrosRelatorio = relatorioFiltrosFromQuery({
      dataEmissaoDe,
      dataEmissaoAte,
      dataRegistroDe,
      dataRegistroAte,
      dataMovimentoDe,
      dataMovimentoAte,
      codigoClienteFornecedor,
      cpfCnpj,
      contaCorrenteId,
    });
    return this.omie.listContasPagar(tid, {
      pagina: p,
      registrosPorPagina: r,
      filtro: parseFiltro(filtro),
      busca: busca?.trim() || undefined,
      filtrosRelatorio,
    });
  }
}
