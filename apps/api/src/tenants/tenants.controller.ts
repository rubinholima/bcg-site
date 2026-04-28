import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { SuperAdminGuard } from '../auth/super-admin.guard';
import { TenantAccessService } from '../auth/tenant-access.service';

@Controller('tenants')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly prisma: PrismaService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private assertSuperAdminForWrite(role: string | undefined) {
    if (role !== 'super_admin') {
      throw new ForbiddenException('Somente super admin pode criar, editar ou excluir empresas.');
    }
  }

  /** Debug: testa conexão e query direta; retorna { ok, error?, count? } — apenas super_admin. */
  @Get('debug')
  @UseGuards(SuperAdminGuard)
  async debug() {
    try {
      const count = await this.prisma.tenant.count();
      return { ok: true, count };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const stack = err instanceof Error ? err.stack : undefined;
      return {
        ok: false,
        error: msg,
        stack: process.env.NODE_ENV !== 'production' ? stack : undefined,
      };
    }
  }

  @Get()
  async findAll(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('clubsOnly') clubsOnly?: string,
  ) {
    try {
      const clubsOnlyBool = clubsOnly === '1' || clubsOnly === 'true';
      const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
      const allowed = await this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
      return await this.tenantsService.findAll(clubsOnlyBool, allowed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new InternalServerErrorException(`GET /tenants: ${msg}`);
    }
  }

  @Get(':id')
  async findOne(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    const allowed = await this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
    return this.tenantsService.findOne(id, allowed);
  }

  @Post()
  async create(@Req() req: Request & { user: CognitoJwtPayload }, @Body() dto: CreateTenantDto) {
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    this.assertSuperAdminForWrite(role);
    const allowed = await this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
    return this.tenantsService.create(dto, allowed);
  }

  @Patch(':id')
  async update(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
  ) {
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    this.assertSuperAdminForWrite(role);
    const allowed = await this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
    return this.tenantsService.update(id, dto, allowed);
  }

  @Delete(':id')
  async remove(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    this.assertSuperAdminForWrite(role);
    const allowed = await this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
    await this.tenantsService.remove(id, allowed);
  }
}
