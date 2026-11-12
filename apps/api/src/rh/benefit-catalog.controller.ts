import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { BenefitCatalogService } from './benefit-catalog.service';
import { RhScopeService } from './rh-scope.service';
import { getRhAllowedTenants } from './rh-request.util';

@Controller('rh/benefit-catalog')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('adm_rh')
export class BenefitCatalogController {
  constructor(
    private readonly service: BenefitCatalogService,
    private readonly scope: RhScopeService,
  ) {}

  @Get()
  findAll(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('all') all?: string,
  ) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.findAll(tenantId, allowed, all !== '1'),
    );
  }

  @Post()
  upsert(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body()
    body: {
      id?: string;
      tenantId: string;
      code: string;
      name: string;
      description?: string;
      active?: boolean;
      sortOrder?: number;
    },
  ) {
    return getRhAllowedTenants(this.scope, req).then((allowed) => this.service.upsert(body, allowed));
  }
}
