import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { JwtAuthGuard, CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../auth/roles.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { TenantAccessService } from '../auth/tenant-access.service';
import { TryoutWorkflowService } from './tryout-workflow.service';
import { TryoutProspectDocumentsService } from './tryout-prospect-documents.service';
import { TryoutSupervisionValidateDto } from './dto/tryout-supervision.dto';
import { TryoutEarlyApprovalDto } from './dto/tryout-renewal.dto';
import { CreateTryoutCoachEvaluationDto } from './dto/tryout-coach-evaluation.dto';
import { UpdateTryoutRegistrationDto } from './dto/tryout-registration.dto';
import { TryoutArrivalDto } from './dto/tryout-arrival.dto';
import {
  TryoutActivateLegacyDto,
  TryoutDirectEntryDto,
  TryoutDuplicateSearchDto,
} from './dto/tryout-direct-entry.dto';
import { TryoutResponsibleCoachDto } from './dto/tryout-responsible-coach.dto';
import { ManagerDecisionDto } from '../captacao/dto/manager-decision.dto';
import { TRYOUT_DOCUMENT_TYPES, type TryoutProspectDocumentType } from './tryout-workflow.constants';

@Controller('tryout-workflow')
@UseGuards(JwtAuthGuard, DashboardRolesGuard)
export class TryoutWorkflowController {
  constructor(
    private readonly service: TryoutWorkflowService,
    private readonly documents: TryoutProspectDocumentsService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private async allowedTenants(req: Request & { user: CognitoJwtPayload }) {
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    return this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
  }

  private userId(req: Request & { user: CognitoJwtPayload }) {
    return (req.user.sub as string) || (req.user as { id?: string }).id;
  }

  @Get('hub')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts', 'futebol_captacao'])
  async hub(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId: string,
    @Query('stage') stage?: string,
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId obrigatório');
    const allowed = await this.allowedTenants(req);
    return this.service.getHub(tenantId.trim(), allowed, stage);
  }

  @Get('reporting')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts', 'futebol_captacao'])
  async reporting(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Query('tenantId') tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('targetCategory') targetCategory?: string,
    @Query('referralSource') referralSource?: string,
    @Query('stage') stage?: string,
  ) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId obrigatório');
    const allowed = await this.allowedTenants(req);
    return this.service.getReporting(tenantId.trim(), allowed, {
      from,
      to,
      targetCategory,
      referralSource,
      stage,
    });
  }

  @Post('duplicate-search')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts', 'futebol_captacao'])
  async duplicateSearch(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: TryoutDuplicateSearchDto,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.searchDuplicates(dto, allowed);
  }

  @Post('direct-entry')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts'])
  async directEntry(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Body() dto: TryoutDirectEntryDto,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.createDirectEntry(dto, allowed, this.userId(req));
  }

  @Get('prospects/:id/dossier')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts', 'futebol_captacao'])
  async dossier(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.getDossier(id, allowed);
  }

  @Get('prospects/:id/documents')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts', 'futebol_captacao'])
  async listDocuments(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await this.allowedTenants(req);
    await this.service.getDossier(id, allowed);
    return this.documents.listActive(id);
  }

  @Post('prospects/:id/documents')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts', 'futebol_captacao'])
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype?: string },
    @Body('documentType') documentType: string,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('Arquivo obrigatório.');
    if (!TRYOUT_DOCUMENT_TYPES.includes(documentType as TryoutProspectDocumentType)) {
      throw new BadRequestException('Tipo de documento inválido.');
    }
    const allowed = await this.allowedTenants(req);
    const prospect = await this.service.getDossier(id, allowed);
    const row = await this.documents.upload(
      id,
      prospect.prospect.tenantId,
      file,
      documentType as TryoutProspectDocumentType,
      this.userId(req),
    );
    return row;
  }

  @Patch('prospects/:id/arrival')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts', 'futebol_captacao'])
  async arrival(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: TryoutArrivalDto,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.setArrival(id, dto, allowed, this.userId(req));
  }

  @Post('prospects/:id/activate-legacy')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts'])
  async activateLegacy(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: TryoutActivateLegacyDto,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.activateLegacyWorkflow(id, dto, allowed, this.userId(req));
  }

  @Post('prospects/:id/start-field-evaluation')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts', 'futebol_captacao'])
  async startFieldEvaluation(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.startFieldEvaluation(id, allowed, this.userId(req));
  }

  @Patch('prospects/:id/responsible-coach')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts'])
  async responsibleCoach(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: TryoutResponsibleCoachDto,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.setResponsibleCoach(id, dto, allowed, this.userId(req));
  }

  @Post('prospects/:id/supervision/validate')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts', 'futebol_captacao'])
  async supervisionValidate(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: TryoutSupervisionValidateDto,
  ) {
    const actor =
      (req.user?.name as string) || (req.user?.email as string) || 'Supervisão';
    const allowed = await this.allowedTenants(req);
    return this.service.validateSupervision(id, dto, actor, allowed, this.userId(req));
  }

  @Post('prospects/:id/renew-period')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts', 'futebol_captacao'])
  renew(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: import('./dto/tryout-renewal.dto').TryoutRenewPeriodDto,
  ) {
    const actor =
      (req.user?.name as string) || (req.user?.email as string) || 'Operação';
    return this.service.renewPeriod(id, dto, actor);
  }

  @Post('prospects/:id/early-approval')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts', 'futebol_captacao'])
  earlyApproval(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: TryoutEarlyApprovalDto,
  ) {
    const actor =
      (req.user?.name as string) || (req.user?.email as string) || 'Operação';
    return this.service.earlyApproval(id, dto, actor);
  }

  @Post('prospects/:id/coach-evaluation')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts', 'futebol_treinadores', 'futebol_captacao'])
  async coachEvaluation(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: CreateTryoutCoachEvaluationDto,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.createCoachEvaluation(id, dto, allowed, this.userId(req));
  }

  @Post('prospects/:id/manager-decision')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts', 'futebol_captacao'])
  async managerDecision(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: ManagerDecisionDto,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.recordTryoutManagerDecision(
      id,
      dto,
      {
        name: req.user?.name,
        email: req.user?.email,
        role: req.user?.role,
      },
      allowed,
      this.userId(req),
    );
  }

  @Patch('prospects/:id/registration')
  @UseGuards(ModuleAccessGuard)
  @RequireModule(['futebol_tryouts', 'futebol_captacao'])
  async registration(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('id') id: string,
    @Body() dto: UpdateTryoutRegistrationDto,
  ) {
    const allowed = await this.allowedTenants(req);
    return this.service.updateRegistration(id, dto, allowed);
  }
}
