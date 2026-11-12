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

  @Get(':id/snapshots/:snapshotId/composition')
  @RequireRh('rh_payroll_view')
  snapshotComposition(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Param('snapshotId') snapshotId: string,
  ) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.getSnapshotComposition(id, snapshotId, allowed),
    );
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
  handoffFinance(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: { paymentDueDate?: string },
  ) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.handoffFinance(id, allowed, getRhActor(this.scope, req), {
        paymentDueDate: body?.paymentDueDate,
      }),
    );
  }

  @Get(':id/finance-status')
  @RequireRh('rh_payroll_view')
  financeStatus(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    return getRhAllowedTenants(this.scope, req).then((allowed) => this.service.getFinanceStatus(id, allowed));
  }

  @Get(':id/occurrences')
  @RequireRh('rh_payroll_view')
  occurrences(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    return getRhAllowedTenants(this.scope, req).then((allowed) => this.service.listOccurrencesForMonth(id, allowed));
  }

  @Get(':id/documents')
  @RequireRh('rh_private_docs_view')
  documents(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    return getRhAllowedTenants(this.scope, req).then((allowed) => this.service.listDocuments(id, allowed));
  }

  @Patch(':id/adjustments/:adjustmentId')
  @RequireRh('rh_payroll_manage')
  patchAdjustment(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Param('adjustmentId') adjustmentId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.updateAdjustment(id, adjustmentId, body as never, allowed, getRhActor(this.scope, req)),
    );
  }

  @Delete(':id/adjustments/:adjustmentId')
  @RequireRh('rh_payroll_manage')
  deleteAdjustment(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Param('adjustmentId') adjustmentId: string,
  ) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.deleteAdjustment(id, adjustmentId, allowed),
    );
  }

  @Post(':id/accounting/prepare')
  @RequireRh('rh_payroll_manage')
  prepareAccounting(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.prepareAccountingSend(id, allowed, getRhActor(this.scope, req)),
    );
  }

  @Post(':id/accounting/request-correction')
  @RequireRh('rh_payroll_manage')
  requestCorrection(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: { notes?: string },
  ) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.requestAccountingCorrection(id, allowed, getRhActor(this.scope, req), body.notes),
    );
  }

  @Post(':id/accounting/approve-return')
  @RequireRh('rh_payroll_manage')
  approveReturn(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: { notes?: string },
  ) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.approveAccountingReturn(id, allowed, getRhActor(this.scope, req), body.notes),
    );
  }

  @Post(':id/accounting/resend')
  @RequireRh('rh_payroll_manage')
  resendAccounting(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() body: { recipient?: string; notes?: string },
  ) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.resendAccounting(id, allowed, getRhActor(this.scope, req), body),
    );
  }
}
