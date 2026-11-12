import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule, RequireRh } from '../auth/require-module.decorator';
import { RhCapabilityGuard } from './rh-capability.guard';
import { RhAthleteMovementService } from './rh-athlete-movement.service';
import { RhScopeService } from './rh-scope.service';
import { getRhActor, getRhAllowedTenants } from './rh-request.util';
import { applyRhTenantFilter } from './rh-scope.util';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Controller('rh/athlete-movements')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard, RhCapabilityGuard)
@RequireModule(['adm_rh', 'rh_athlete_payroll', 'rh_payroll_view'])
export class RhAthleteMovementController {
  constructor(
    private readonly service: RhAthleteMovementService,
    private readonly scope: RhScopeService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('pending-actions')
  @RequireRh('rh_athlete_payroll')
  pendingActions(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: string,
  ) {
    return getRhAllowedTenants(this.scope, req).then(async (allowed) => {
      const where: Prisma.RhAthleteHrPendingActionWhereInput = {};
      applyRhTenantFilter(where, allowed, tenantId);
      if (status?.trim()) where.status = status.trim();
      return this.prisma.rhAthleteHrPendingAction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    });
  }

  @Post('pending-actions/:id/acknowledge')
  @RequireRh('rh_athlete_payroll')
  acknowledge(@Req() req: Request & { user: CognitoJwtPayload }, @Param('id') id: string) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.acknowledgePendingAction(id, allowed, getRhActor(this.scope, req)),
    );
  }

  @Post('salary-responsibility')
  @RequireRh('rh_athlete_payroll')
  createResponsibility(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body()
    body: {
      employmentId: string;
      playerNegotiationId?: string;
      mode: string;
      ourPercentage?: number;
      otherPercentage?: number;
      effectiveFrom: string;
      effectiveUntil?: string | null;
      notes?: string;
      documentRef?: string;
    },
  ) {
    return getRhAllowedTenants(this.scope, req).then((allowed) =>
      this.service.createSalaryResponsibility(body, allowed, getRhActor(this.scope, req)),
    );
  }
}
