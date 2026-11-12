import {
  BadRequestException,
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
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { TenantAccessService } from '../auth/tenant-access.service';
import { FinanceiroLancamentosService } from './financeiro-lancamentos.service';
import { CreateFinanceiroLancamentoDto } from './dto/create-financeiro-lancamento.dto';
import { UpdateFinanceiroLancamentoDto } from './dto/update-financeiro-lancamento.dto';
import { CreateOperationalLancamentoDto } from './dto/create-operational-lancamento.dto';
import { FinanceCapabilityGuard } from './finance-capability.guard';
import { RequireFinance, RequireModule } from '../auth/require-module.decorator';

@Controller('financeiro/lancamentos')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, FinanceCapabilityGuard)
export class FinanceiroLancamentosController {
  constructor(
    private readonly service: FinanceiroLancamentosService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private async actorUserId(req: Request & { user: CognitoJwtPayload }): Promise<string | null> {
    return this.tenantAccess.resolveInternalUserId(req.user.sub);
  }

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

  @Get('resumo')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_financeiro')
  async resumo(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId: string,
    @Query('tipo') tipo?: string,
  ) {
    const tid = await this.requireTenantScope(req, tenantId);
    return this.service.resumo(tid, tipo?.trim());
  }

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_financeiro')
  async findAll(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId: string,
    @Query('tipo') tipo?: string,
    @Query('status') status?: string,
    @Query('vencimentoDe') vencimentoDe?: string,
    @Query('vencimentoAte') vencimentoAte?: string,
    @Query('busca') busca?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const tid = await this.requireTenantScope(req, tenantId);
    return this.service.findAll(tid, {
      tipo: tipo?.trim(),
      status: status?.trim(),
      vencimentoDe: vencimentoDe?.trim(),
      vencimentoAte: vencimentoAte?.trim(),
      busca: busca?.trim(),
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_financeiro')
  async findOne(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const row = await this.service.findOne(id);
    await this.requireTenantScope(req, row.tenantId);
    return row;
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['adm_financeiro', 'finance_create'])
  @RequireFinance('finance_create')
  async create(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: CreateFinanceiroLancamentoDto,
  ) {
    await this.requireTenantScope(req, dto.tenantId);
    const userId = await this.actorUserId(req);
    return this.service.create({ ...dto, createdByUserId: userId });
  }

  @Post('operacional')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['adm_financeiro', 'finance_create'])
  @RequireFinance('finance_create')
  async createOperational(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: CreateOperationalLancamentoDto,
  ) {
    await this.requireTenantScope(req, dto.tenantId);
    const userId = await this.actorUserId(req);
    return this.service.createManualOperational(
      {
        ...dto,
        originalAmount: dto.originalAmount ?? dto.valor,
        valor: dto.valor,
      },
      { userId, name: req.user.email ?? null },
    );
  }

  @Post(':id/aprovar')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['adm_financeiro', 'finance_approve'])
  @RequireFinance('finance_approve')
  async approve(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    const tid = await this.requireTenantScope(req, tenantId);
    const userId = await this.actorUserId(req);
    return this.service.approvePayment(id, tid, userId);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_financeiro')
  async update(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdateFinanceiroLancamentoDto,
  ) {
    const existing = await this.service.findOne(id);
    await this.requireTenantScope(req, existing.tenantId);
    const userId = await this.actorUserId(req);
    return this.service.update(id, dto, userId);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_financeiro')
  async remove(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const existing = await this.service.findOne(id);
    await this.requireTenantScope(req, existing.tenantId);
    const userId = await this.actorUserId(req);
    return this.service.remove(id, userId);
  }
}
