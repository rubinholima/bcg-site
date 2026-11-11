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
import { RequireModule, RequireProcurement } from '../auth/require-module.decorator';
import { ProcurementCapabilityGuard } from './procurement-capability.guard';
import { TenantAccessService } from '../auth/tenant-access.service';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Controller('compras/suppliers')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard, ProcurementCapabilityGuard)
/** Cadastro único: Compras, Financeiro, Logística ou permissão group_fornecedores. */
@RequireModule(['adm_compras', 'adm_financeiro', 'futebol_logistica', 'group_fornecedores'])
export class SuppliersController {
  constructor(
    private readonly service: SuppliersService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private roleFrom(req: Request & { user: CognitoJwtPayload }) {
    return req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
  }

  private actor(req: Request & { user: CognitoJwtPayload }) {
    return {
      userId: req.user.sub,
      name: (req.user.name as string) ?? (req.user.email as string) ?? 'Usuário',
    };
  }

  private async allowedTenants(req: Request & { user: CognitoJwtPayload }) {
    return this.tenantAccess.getAllowedTenantIds(req.user.sub, this.roleFrom(req));
  }

  private async requireTenantScope(
    req: Request & { user: CognitoJwtPayload },
    tenantIdRaw: string | undefined,
  ): Promise<string> {
    if (!tenantIdRaw?.trim()) {
      throw new BadRequestException('tenantId é obrigatório.');
    }
    const tenantId = tenantIdRaw.trim();
    const allowed = await this.allowedTenants(req);
    this.tenantAccess.assertCanAccessTenant(allowed, tenantId);
    return tenantId;
  }

  private async assertRowTenant(
    req: Request & { user: CognitoJwtPayload },
    tenantId: string,
  ): Promise<void> {
    const allowed = await this.allowedTenants(req);
    this.tenantAccess.assertCanAccessTenant(allowed, tenantId);
  }

  @Get()
  @RequireProcurement('view_supplier')
  async findAll(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
    @Query('country') country?: string,
  ) {
    const allowed = await this.allowedTenants(req);
    const tid = tenantId?.trim();
    if (tid) {
      this.tenantAccess.assertCanAccessTenant(allowed, tid);
      return this.service.findAll(tid, search, allowed, { status, categoryId, country });
    }
    return this.service.findAll(undefined, search, allowed, { status, categoryId, country });
  }

  @Get(':id/history')
  @RequireProcurement('view_supplier')
  async history(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const row = await this.service.findOne(id);
    await this.assertRowTenant(req, row.tenantId);
    return this.service.getHistory(id);
  }

  @Get(':id')
  @RequireProcurement('view_supplier')
  async findOne(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const row = await this.service.findOne(id);
    await this.assertRowTenant(req, row.tenantId);
    return row;
  }

  @Post()
  @RequireProcurement('manage_supplier')
  async create(@Req() req: Request & { user: CognitoJwtPayload }, @Body() dto: CreateSupplierDto) {
    await this.requireTenantScope(req, dto.tenantId);
    return this.service.create(dto, this.actor(req));
  }

  @Patch(':id/status')
  @RequireProcurement('manage_supplier')
  async setStatus(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    const row = await this.service.findOne(id);
    await this.assertRowTenant(req, row.tenantId);
    return this.service.setStatus(id, status, this.actor(req));
  }

  @Post(':id/documents')
  @RequireProcurement('manage_supplier')
  async addDocument(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: { label: string; docType?: string; mediaKey?: string; fileUrl?: string },
  ) {
    const row = await this.service.findOne(id);
    await this.assertRowTenant(req, row.tenantId);
    return this.service.addDocument(
      id,
      { ...body, createdByUserId: req.user.sub },
      this.actor(req),
    );
  }

  @Delete(':id/documents/:documentId')
  @RequireProcurement('manage_supplier')
  async removeDocument(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ) {
    const row = await this.service.findOne(id);
    await this.assertRowTenant(req, row.tenantId);
    return this.service.removeDocument(id, documentId, this.actor(req));
  }

  @Patch(':id')
  @RequireProcurement('manage_supplier')
  async update(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    const row = await this.service.findOne(id);
    await this.assertRowTenant(req, row.tenantId);
    return this.service.update(id, dto, this.actor(req));
  }

  @Delete(':id')
  @RequireProcurement('manage_supplier')
  async remove(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const row = await this.service.findOne(id);
    await this.assertRowTenant(req, row.tenantId);
    return this.service.remove(id, this.actor(req));
  }
}
