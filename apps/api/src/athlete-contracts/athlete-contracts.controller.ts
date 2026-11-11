import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Post('tenants/:tenantId/athlete-contract-types/:typeId/active')
  setTypeActive(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('tenantId') tenantId: string,
    @Param('typeId') typeId: string,
    @Body() body: { active?: boolean },
  ) {
    return this.service.disableContractType(tenantId, typeId, req.user, body?.active !== false);
  }

  @Get('tenants/:tenantId/athlete-contracts/report-presets')
  reportPresets() {
    return AthleteContractsService.reportPresets();
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

  @Get('players/:playerId/contractual-dossier/pdf')
  async dossierPdf(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('playerId') playerId: string,
  ) {
    const { pdf, filename } = await this.service.getContractualDossierPdf(playerId, req.user, null);
    return new StreamableFile(pdf, {
      type: 'application/pdf',
      disposition: `inline; filename="${filename.replace(/"/g, '')}"`,
    });
  }

  @Post('players/:playerId/athlete-contract-documents')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  uploadDocument(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('playerId') playerId: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype?: string } | undefined,
    @Body()
    body: {
      category?: string;
      documentType?: string;
      description?: string;
      contractId?: string;
      federativeProcessId?: string;
      professionalizationCaseId?: string;
      legalDocumentId?: string;
      issueDate?: string;
      expirationDate?: string;
    },
  ) {
    return this.service.uploadHubDocument(playerId, req.user, null, file as never, body);
  }

  @Get('players/:playerId/athlete-contract-documents/:attachmentId/file')
  async streamDocument(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('playerId') playerId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    const { buffer, filename } = await this.service.streamHubDocument(
      playerId,
      attachmentId,
      req.user,
      null,
    );
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `inline; filename="${filename.replace(/"/g, '_')}"`,
    });
  }

  @Post('players/:playerId/athlete-contract-finance-links')
  financeLink(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('playerId') playerId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.createFinanceLink(playerId, req.user, null, body);
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
