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
import { RequireModule } from '../auth/require-module.decorator';
import { TenantAccessService } from '../auth/tenant-access.service';
import { FinanceiroLancamentosService } from './financeiro-lancamentos.service';
import { CreateFinanceiroLancamentoDto } from './dto/create-financeiro-lancamento.dto';
import { UpdateFinanceiroLancamentoDto } from './dto/update-financeiro-lancamento.dto';

@Controller('financeiro/lancamentos')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class FinanceiroLancamentosController {
  constructor(
    private readonly service: FinanceiroLancamentosService,
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
  ) {
    const tid = await this.requireTenantScope(req, tenantId);
    return this.service.findAll(tid, {
      tipo: tipo?.trim(),
      status: status?.trim(),
      vencimentoDe: vencimentoDe?.trim(),
      vencimentoAte: vencimentoAte?.trim(),
      busca: busca?.trim(),
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
  @RequireModule('adm_financeiro')
  async create(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: CreateFinanceiroLancamentoDto,
  ) {
    await this.requireTenantScope(req, dto.tenantId);
    return this.service.create(dto);
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
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('adm_financeiro')
  async remove(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const existing = await this.service.findOne(id);
    await this.requireTenantScope(req, existing.tenantId);
    return this.service.remove(id);
  }
}
