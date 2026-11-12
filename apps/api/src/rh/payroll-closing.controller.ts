import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule, RequireRh } from '../auth/require-module.decorator';
import { RhCapabilityGuard } from './rh-capability.guard';
import { PayrollClosingService } from './payroll-closing.service';
import { RhScopeService } from './rh-scope.service';
import { getRhActor, getRhAllowedTenants } from './rh-request.util';

@Controller('rh/payroll-closings')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard, RhCapabilityGuard)
@RequireModule(['adm_rh', 'rh_payroll_view', 'rh_payroll_manage'])
export class PayrollClosingController {
  constructor(
    private readonly service: PayrollClosingService,
    private readonly scope: RhScopeService,
  ) {}

  @Get()
  @RequireRh('rh_payroll_view')
  findAll(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: string,
  ) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.findAll({ tenantId, status }, allowed),
    );
  }

  @Get(':id')
  @RequireRh('rh_payroll_view')
  findOne(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    return getRhAllowedTenants(this.scope, req).then((allowed) => this.service.findOne(id, allowed));
  }

  @Post()
  @RequireRh('rh_payroll_manage')
  create(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() body: { tenantId: string; referenceMonth: string; notes?: string },
  ) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.create(body, allowed, getRhActor(this.scope, req)),
    );
  }

  @Post(':id/prepare')
  @RequireRh('rh_payroll_manage')
  prepare(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.prepareSnapshots(id, allowed, getRhActor(this.scope, req)),
    );
  }

  @Post(':id/transition')
  @RequireRh('rh_payroll_manage')
  transition(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: { toStatus: string; notes?: string },
  ) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.transition(id, body.toStatus, allowed, getRhActor(this.scope, req), body.notes),
    );
  }

  @Post(':id/adjustments')
  @RequireRh('rh_payroll_manage')
  adjustment(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body()
    body: {
      employmentId: string;
      adjustmentType: string;
      amount?: number;
      hours?: number;
      days?: number;
      quantity?: number;
      reason?: string;
      notes?: string;
    },
  ) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.createAdjustment(id, body, allowed, getRhActor(this.scope, req)),
    );
  }

  @Post(':id/accounting/send')
  @RequireRh('rh_payroll_manage')
  sendAccounting(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: { recipient?: string; notes?: string },
  ) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.sendAccountingPackage(id, body, allowed, getRhActor(this.scope, req)),
    );
  }

  @Post(':id/accounting/return')
  @RequireRh('rh_payroll_manage')
  returnAccounting(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: { notes?: string; correctionRequired?: boolean },
  ) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.returnAccountingPackage(id, body, allowed, getRhActor(this.scope, req)),
    );
  }

  @Post(':id/handoff-finance')
  @RequireRh('rh_payroll_manage')
  handoffFinance(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.handoffFinance(id, allowed, getRhActor(this.scope, req)),
    );
  }
}
