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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('financeiro/customers')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('adm_financeiro')
export class CustomersController {
  constructor(
    private readonly service: CustomersService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private roleFrom(req: Request & { user: CognitoJwtPayload }) {
    return req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
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
  async findAll(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('search') search?: string,
  ) {
    const allowed = await this.allowedTenants(req);
    const tid = tenantId?.trim();
    if (tid) {
      this.tenantAccess.assertCanAccessTenant(allowed, tid);
      return this.service.findAll(tid, search, allowed);
    }
    return this.service.findAll(undefined, search, allowed);
  }

  @Get(':id')
  async findOne(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const row = await this.service.findOne(id);
    await this.assertRowTenant(req, row.tenantId);
    return row;
  }

  @Post()
  async create(@Req() req: Request & { user: CognitoJwtPayload }, @Body() dto: CreateCustomerDto) {
    await this.requireTenantScope(req, dto.tenantId);
    return this.service.create(dto);
  }

  @Patch(':id')
  async update(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    const row = await this.service.findOne(id);
    await this.assertRowTenant(req, row.tenantId);
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const row = await this.service.findOne(id);
    await this.assertRowTenant(req, row.tenantId);
    return this.service.remove(id);
  }
}
