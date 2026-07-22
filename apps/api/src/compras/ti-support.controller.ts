import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { requestActor } from '../common/request-actor';
import { TiSupportService } from './ti-support.service';
import { PurchaseWorkflowService } from './purchase-workflow.service';

type AuthedRequest = Request & { user: CognitoJwtPayload };

@Controller('ti')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule('adm_ti')
export class TiSupportController {
  constructor(
    private readonly ti: TiSupportService,
    private readonly workflow: PurchaseWorkflowService,
  ) {}

  @Get('tickets')
  listTickets(@Query('tenantId') tenantId?: string, @Query('status') status?: string) {
    return this.ti.findAll(tenantId, status);
  }

  @Post('tickets')
  createTicket(
    @Req() req: AuthedRequest,
    @Body()
    body: { tenantId: string; subject: string; description?: string; priority?: string },
  ) {
    const actor = requestActor(req.user);
    return this.ti.create({
      tenantId: body.tenantId,
      requestedByUserId: actor.userId,
      requestedByName: actor.name,
      subject: body.subject,
      description: body.description,
      priority: body.priority,
    });
  }

  @Get('tickets/:id')
  getTicket(@Param('id') id: string) {
    return this.ti.findOne(id);
  }

  @Patch('tickets/:id')
  updateTicket(
    @Param('id') id: string,
    @Body()
    body: { status?: string; assignedToName?: string; resolutionNotes?: string; priority?: string },
  ) {
    return this.ti.update(id, body);
  }

  @Get('purchase-requisitions')
  listPurchaseReqs(@Query('tenantId') tenantId?: string) {
    return this.workflow.findAll({ tenantId, requestType: 'ti' });
  }

  @Post('purchase-requisitions')
  createPurchaseReq(
    @Req() req: AuthedRequest,
    @Body()
    body: {
      tenantId: string;
      departmentName?: string;
      justification?: string;
      items: Array<{
        description: string;
        quantity: number;
        unit?: string;
        estimatedUnitPrice?: number;
        isPatrimonial?: boolean;
      }>;
      totalEstimated?: number;
      isPatrimonial?: boolean;
    },
  ) {
    const actor = requestActor(req.user);
    return this.workflow.createRequisition({
      ...body,
      requestType: 'ti',
      requestedByUserId: actor.userId,
      requestedByName: actor.name,
      requesterEmail: actor.email ?? undefined,
    });
  }
}

@Controller('ti/public')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard)
@RequireModule(['requisicoes', 'adm_ti'])
export class TiPublicController {
  constructor(private readonly ti: TiSupportService) {}

  @Post('tickets')
  createTicket(
    @Req() req: AuthedRequest,
    @Body()
    body: { tenantId: string; subject: string; description?: string; priority?: string },
  ) {
    const actor = requestActor(req.user);
    return this.ti.create({
      tenantId: body.tenantId,
      requestedByUserId: actor.userId,
      requestedByName: actor.name,
      subject: body.subject,
      description: body.description,
      priority: body.priority,
    });
  }

  @Get('tickets/mine')
  myTickets(@Req() req: AuthedRequest) {
    return this.ti.findAll(undefined, undefined).then((rows) =>
      rows.filter((r) => r.requestedByUserId === req.user.sub),
    );
  }
}
