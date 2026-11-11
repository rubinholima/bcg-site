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
import { SupplierCategoriesService } from './supplier-categories.service';

@Controller('compras/supplier-categories')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule(['adm_compras', 'adm_financeiro', 'group_fornecedores'])
export class SupplierCategoriesController {
  constructor(
    private readonly service: SupplierCategoriesService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private roleFrom(req: Request & { user: CognitoJwtPayload }) {
    return req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
  }

  private async allowedTenants(req: Request & { user: CognitoJwtPayload }) {
    return this.tenantAccess.getAllowedTenantIds(req.user.sub, this.roleFrom(req));
  }

  @Get()
  async findAll(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
  ) {
    const allowed = await this.allowedTenants(req);
    const tid = tenantId?.trim();
    if (tid) {
      this.tenantAccess.assertCanAccessTenant(allowed, tid);
    }
    return this.service.findAll(tid, allowed);
  }

  @Post()
  async create(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() body: { tenantId: string; name: string; sortOrder?: number },
  ) {
    if (!body.tenantId?.trim() || !body.name?.trim()) {
      throw new BadRequestException('tenantId e name são obrigatórios.');
    }
    const allowed = await this.allowedTenants(req);
    this.tenantAccess.assertCanAccessTenant(allowed, body.tenantId.trim());
    return this.service.create(body.tenantId.trim(), body.name.trim(), body.sortOrder);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; sortOrder?: number; active?: boolean },
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
