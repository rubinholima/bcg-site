import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule, RequireRh } from '../auth/require-module.decorator';
import { RhCapabilityGuard } from './rh-capability.guard';
import { RhEpiService } from './rh-epi.service';
import { RhScopeService } from './rh-scope.service';
import { getRhActor, getRhAllowedTenants } from './rh-request.util';

@Controller('rh/epi')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard, RhCapabilityGuard)
@RequireModule(['adm_rh', 'rh_epi_view', 'rh_epi_manage'])
export class RhEpiController {
  constructor(
    private readonly service: RhEpiService,
    private readonly scope: RhScopeService,
  ) {}

  @Get('catalog')
  @RequireRh('rh_epi_view')
  catalog(@Req() req: Request & { user: CognitoJwtPayload }, @Query('tenantId') tenantId?: string) {
    return getRhAllowedTenants(this.scope, req).then((allowed) => this.service.listCatalog(tenantId, allowed));
  }

  @Post('catalog')
  @RequireRh('rh_epi_manage')
  upsertCatalog(@Req() req: Request & { user: CognitoJwtPayload }, @Body() body: Record<string, unknown>) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.upsertCatalogItem(body as never, allowed, getRhActor(this.scope, req)),
    );
  }

  @Get('requirements')
  @RequireRh('rh_epi_view')
  requirements(@Req() req: Request & { user: CognitoJwtPayload }, @Query('tenantId') tenantId?: string) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.listRequirementGroups(tenantId, allowed),
    );
  }

  @Post('requirements')
  @RequireRh('rh_epi_manage')
  createRequirement(@Req() req: Request & { user: CognitoJwtPayload }, @Body() body: Record<string, unknown>) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.createRequirementGroup(body as never, allowed, getRhActor(this.scope, req)),
    );
  }

  @Get('deliveries')
  @RequireRh('rh_epi_view')
  deliveries(@Req() req: Request & { user: CognitoJwtPayload }, @Query('tenantId') tenantId?: string) {
    return getRhAllowedTenants(this.scope, req).then((allowed) => this.service.listDeliveries(tenantId, allowed));
  }

  @Post('deliveries')
  @RequireRh('rh_epi_delivery')
  delivery(@Req() req: Request & { user: CognitoJwtPayload }, @Body() body: Record<string, unknown>) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.createDelivery(body as never, allowed, getRhActor(this.scope, req)),
    );
  }

  @Patch('deliveries/:id/status')
  @RequireRh('rh_epi_manage')
  patchDeliveryStatus(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: { status: string; notes?: string },
  ) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.updateDeliveryStatus(id, body, allowed, getRhActor(this.scope, req)),
    );
  }

  @Post('deliveries/:id/acknowledge')
  @RequireRh('rh_epi_delivery')
  acknowledge(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.acknowledgeDelivery(id, allowed, getRhActor(this.scope, req)),
    );
  }

  @Get('employees/:employeeId/summary')
  @RequireRh('rh_epi_view')
  employeeSummary(@Req() req: Request & { user: CognitoJwtPayload }, @Param('employeeId') employeeId: string) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.employeeEpiSummary(employeeId, allowed),
    );
  }
}
