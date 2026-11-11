import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { TenantAccessService } from '../auth/tenant-access.service';
import { AthleteContractsService } from './athlete-contracts.service';

@Controller()
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class AthleteContractsController {
  constructor(
    private readonly service: AthleteContractsService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private async allowed(req: Request & { user: CognitoJwtPayload }) {
    const role = req.user.role ?? 'user';
    return this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
  }

  @Get('tenants/:tenantId/athlete-contract-types')
  listTypes(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('tenantId') tenantId: string,
  ) {
    return this.service.listContractTypes(tenantId, req.user);
  }

  @Post('tenants/:tenantId/athlete-contract-types')
  createType(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('tenantId') tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.upsertContractType(tenantId, req.user, body as never);
  }

  @Patch('tenants/:tenantId/athlete-contract-types/:typeId')
  updateType(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('tenantId') tenantId: string,
    @Param('typeId') typeId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.upsertContractType(tenantId, req.user, { ...body, id: typeId } as never);
  }

  @Get('players/:playerId/athlete-contract-hub')
  hub(@Req() req: Request & { user: CognitoJwtPayload }, @Param('playerId') playerId: string) {
    return this.service.getContractHub(playerId, req.user, null);
  }

  @Post('players/:playerId/athlete-contracts')
  createContract(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('playerId') playerId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.createContract(playerId, req.user, null, body);
  }

  @Post('players/:playerId/athlete-contracts/legacy')
  createLegacy(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('playerId') playerId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.createLegacyContract(playerId, req.user, null, body);
  }

  @Post('players/:playerId/athlete-evaluation')
  upsertEvaluation(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('playerId') playerId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.upsertEvaluation(playerId, req.user, null, body);
  }

  @Post('players/:playerId/athlete-federative')
  upsertFederative(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('playerId') playerId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.upsertFederative(playerId, req.user, null, body);
  }

  @Post('players/:playerId/athlete-professionalization')
  startProfessionalization(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('playerId') playerId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.startProfessionalization(playerId, req.user, null, body);
  }

  @Get('players/:playerId/contractual-dossier')
  dossier(@Req() req: Request & { user: CognitoJwtPayload }, @Param('playerId') playerId: string) {
    return this.service.getContractualDossier(playerId, req.user, null);
  }

  @Post('tenants/:tenantId/athlete-contracts/report')
  report(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('tenantId') tenantId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.runContractReport(tenantId, req.user, body);
  }

  @Get('tenants/:tenantId/athlete-contracts/alerts')
  alerts(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('tenantId') tenantId: string,
  ) {
    return this.service.tenantExpirationAlerts(tenantId, req.user);
  }
}
