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
import { JwtAuthGuard, CognitoJwtPayload } from '../../auth/jwt-auth.guard';
import { DashboardRolesGuard } from '../../auth/roles.guard';
import { ModuleAccessGuard } from '../../auth/module-access.guard';
import { RequireFinance, RequireModule } from '../../auth/require-module.decorator';
import { TenantAccessService } from '../../auth/tenant-access.service';
import { FinanceCapabilityGuard } from '../finance-capability.guard';
import { FinanceImportBatchService } from './finance-import-batch.service';
import { FinanceImportExecutionService } from './finance-import-execution.service';
import { FinanceImportReviewService } from './finance-import-review.service';
import { pivotSafetyLockActive } from './finance-import-pivot-safety.util';

@Controller('financeiro/importacoes')
@UseGuards(JwtAuthGuard, DashboardRolesGuard, ModuleAccessGuard, FinanceCapabilityGuard)
@RequireModule('adm_financeiro')
export class FinanceImportController {
  constructor(
    private readonly batches: FinanceImportBatchService,
    private readonly execution: FinanceImportExecutionService,
    private readonly review: FinanceImportReviewService,
    private readonly tenantAccess: TenantAccessService,
  ) {}

  private async requireTenant(req: Request & { user: CognitoJwtPayload }, tenantId?: string) {
    if (!tenantId?.trim()) throw new BadRequestException('tenantId é obrigatório.');
    const tid = tenantId.trim();
    const role = req.user.role ?? req.user['cognito:groups']?.[0] ?? 'user';
    const allowed = await this.tenantAccess.getAllowedTenantIds(req.user.sub, role);
    this.tenantAccess.assertCanAccessTenant(allowed, tid);
    return tid;
  }

  private async actor(req: Request & { user: CognitoJwtPayload }) {
    const userId = await this.tenantAccess.resolveInternalUserId(req.user.sub);
    return { userId: userId ?? req.user.sub, name: req.user.email ?? null };
  }

  @Post('upload')
  @RequireFinance('finance_import_create')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 30 * 1024 * 1024 } }))
  async upload(
    @Req() req: Request & { user: CognitoJwtPayload },
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype?: string } | undefined,
    @Body('tenantId') tenantId?: string,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    const actor = await this.actor(req);
    if (!file?.buffer?.length) throw new BadRequestException('Envie um arquivo .xlsx (campo file).');
    return this.batches.upload(
      tid,
      file.buffer,
      file.originalname || 'import.xlsx',
      file.mimetype,
      actor.userId,
      actor.name,
    );
  }

  @Post(':batchId/analisar')
  @RequireFinance('finance_import_create')
  async analyze(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('batchId') batchId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    const actor = await this.actor(req);
    return this.batches.analyze(tid, batchId, actor.userId, actor.name);
  }

  @Get()
  @RequireFinance('finance_import_view')
  async list(@Req() req: Request & { user: CognitoJwtPayload }, @Query('tenantId') tenantId?: string) {
    const tid = await this.requireTenant(req, tenantId);
    return this.batches.listBatches(tid);
  }

  @Get(':batchId')
  @RequireFinance('finance_import_view')
  async detail(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('batchId') batchId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    return this.batches.getBatchDetail(tid, batchId);
  }

  @Get(':batchId/mapeamentos-bulk')
  @RequireFinance('finance_import_view')
  async bulkMappings(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('batchId') batchId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    return this.review.getBulkMappings(tid, batchId);
  }

  @Get(':batchId/duplicidades')
  @RequireFinance('finance_import_view')
  async duplicates(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('batchId') batchId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    return this.review.listPossibleDuplicates(tid, batchId);
  }

  @Get(':batchId/conflitos')
  @RequireFinance('finance_import_view')
  async conflicts(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('batchId') batchId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    return this.review.listConflicts(tid, batchId);
  }

  @Get(':batchId/resultados')
  @RequireFinance('finance_import_view')
  async results(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('batchId') batchId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    return this.review.getExecutionResults(tid, batchId);
  }

  @Get(':batchId/linhas')
  @RequireFinance('finance_import_view')
  async rows(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('batchId') batchId: string,
    @Query('tenantId') tenantId?: string,
    @Query('validationStatus') validationStatus?: string,
    @Query('classification') classification?: string,
    @Query('duplicateState') duplicateState?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    return this.batches.listStagingRows(
      tid,
      batchId,
      { validationStatus, classification, duplicateState },
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 50,
    );
  }

  @Patch(':batchId/mapeamentos')
  @RequireFinance('finance_import_create')
  async mappings(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('batchId') batchId: string,
    @Body() body: { tenantId: string; updates: Array<Record<string, unknown>> },
  ) {
    const tid = await this.requireTenant(req, body.tenantId);
    const actor = await this.actor(req);
    const updates = Array.isArray(body.updates) ? body.updates : [];
    return this.batches.updateMappings(tid, batchId, updates as never, actor.userId, actor.name);
  }

  @Patch(':batchId/linhas-decisoes')
  @RequireFinance('finance_import_create')
  async rowDecisions(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('batchId') batchId: string,
    @Body()
    body: {
      tenantId: string;
      updates: Array<{ stagingRowId: string; rowDecision: string; reason?: string }>;
    },
  ) {
    const tid = await this.requireTenant(req, body.tenantId);
    const actor = await this.actor(req);
    return this.review.updateRowDecisions(tid, batchId, body.updates ?? [], actor.userId, actor.name);
  }

  @Patch(':batchId/duplicidades-decisoes')
  @RequireFinance('finance_import_approve')
  async duplicateDecisions(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('batchId') batchId: string,
    @Body()
    body: {
      tenantId: string;
      updates: Array<{
        stagingRowId: string;
        duplicateDecision: 'LINK_AND_SKIP' | 'IMPORT_SEPARATELY' | 'KEEP_FOR_REVIEW';
        reason?: string;
        linkLancamentoId?: string;
      }>;
    },
  ) {
    const tid = await this.requireTenant(req, body.tenantId);
    const actor = await this.actor(req);
    return this.review.updateDuplicateDecisions(tid, batchId, body.updates ?? [], actor.userId, actor.name);
  }

  @Post(':batchId/simular')
  @RequireFinance('finance_import_create')
  async simulate(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('batchId') batchId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    const actor = await this.actor(req);
    return this.batches.simulate(tid, batchId, actor.userId, actor.name);
  }

  @Post(':batchId/aprovar')
  @RequireFinance('finance_import_approve')
  async approve(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('batchId') batchId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    const actor = await this.actor(req);
    return this.batches.approve(tid, batchId, actor.userId, actor.name);
  }

  @Post(':batchId/aprovar-execucao')
  @RequireFinance('finance_import_execute')
  async approveExecution(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('batchId') batchId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    const actor = await this.actor(req);
    return this.review.approveExecution(tid, batchId, actor.userId, actor.name);
  }

  @Post(':batchId/executar')
  @RequireFinance('finance_import_execute')
  async execute(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('batchId') batchId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    const actor = await this.actor(req);
    const detail = await this.batches.getBatchDetail(tid, batchId);
    const pivotLocked = pivotSafetyLockActive(detail.batch);
    const allowCanonical =
      !pivotLocked && process.env.FINANCE_IMPORT_ALLOW_CANONICAL_WRITE === '1';
    return this.execution.executeBatch(tid, batchId, {
      allowCanonicalWrite: allowCanonical,
      actorUserId: actor.userId,
      actorName: actor.name,
    });
  }

  @Post(':batchId/cancelar')
  @RequireFinance('finance_import_create')
  async cancel(
    @Req() req: Request & { user: CognitoJwtPayload },
    @Param('batchId') batchId: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const tid = await this.requireTenant(req, tenantId);
    return this.batches.cancel(tid, batchId);
  }
}
