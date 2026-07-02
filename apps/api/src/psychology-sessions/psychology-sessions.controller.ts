import {
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
import { PsychologySessionsService } from './psychology-sessions.service';
import {
  CreatePsychologySessionDto,
  UpdatePsychologySessionDto,
} from './dto/psychology-session.dto';

@Controller('psychology-sessions')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class PsychologySessionsController {
  constructor(
    private readonly service: PsychologySessionsService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private async allowedTenants(req: Request & { user: CognitoJwtPayload }) {
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    return this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
  }

  @Get()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async list(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('sessionType') sessionType?: string,
    @Query('category') category?: string,
  ) {
    const allowed = await this.allowedTenants(req);
    if (tenantId?.trim()) {
      this.tenantAccess.assertCanAccessTenant(allowed, tenantId.trim());
    }
    return this.service.list({ tenantId, from, to, sessionType, category }, allowed);
  }

  @Get('category-roster')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async categoryRoster(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId: string,
    @Query('category') category: string,
  ) {
    const allowed = await this.allowedTenants(req);
    this.tenantAccess.assertCanAccessTenant(allowed, tenantId);
    return this.service.categoryRoster(tenantId, category);
  }

  @Get(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async findOne(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const allowed = await this.allowedTenants(req);
    return this.service.findOne(id, allowed);
  }

  @Post()
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async create(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: CreatePsychologySessionDto,
  ) {
    const allowed = await this.allowedTenants(req);
    this.tenantAccess.assertCanAccessTenant(allowed, dto.tenantId);
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async update(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdatePsychologySessionDto,
  ) {
    const allowed = await this.allowedTenants(req);
    await this.service.findOne(id, allowed);
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(ModuleAccessGuard)
  @RequireModule('saude')
  async remove(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    const allowed = await this.allowedTenants(req);
    await this.service.findOne(id, allowed);
    return this.service.remove(id);
  }
}
