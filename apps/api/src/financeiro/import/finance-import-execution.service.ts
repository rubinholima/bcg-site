import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FinanceAuditService } from '../finance-audit.service';
import {
  assertCanonicalImportAllowed,
  pivotSafetyLockActive,
} from './finance-import-pivot-safety.util';
import {
  buildLancamentoPayload,
  FINANCE_IMPORT_RECORD_ORIGIN,
  FINANCE_IMPORT_SOURCE_MODULE,
  FINANCE_IMPORT_SOURCE_TYPE,
  settlementIdempotencyKey,
  shouldSkipExecution,
  type ExecutionRowContext,
} from './finance-import-execution.engine';
import { mappingKey, isMappingResolved, type MappingRowLike } from './finance-import-readiness.util';
import { batchReadiness } from './finance-import-readiness.util';
import type { FinanceImportExecutionResult } from './finance-import.types';
import { computeSettlementFinal, moneyDecimal } from '../finance-money.util';

export type FinanceImportExecuteOptions = {
  allowCanonicalWrite?: boolean;
  allowPivotOverride?: boolean;
  actorUserId?: string | null;
  actorName?: string | null;
};

const LOCK_STALE_MS = 15 * 60 * 1000;

@Injectable()
export class FinanceImportExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: FinanceAuditService,
  ) {}

  async executeBatch(tenantId: string, batchId: string, opts: FinanceImportExecuteOptions) {
    const batch = await this.prisma.financeImportBatch.findFirst({
      where: { id: batchId, tenantId },
    });
    if (!batch) throw new NotFoundException('Lote de importação não encontrado.');
    if (batch.status !== 'APPROVED' && batch.status !== 'IMPORTING' && batch.status !== 'FAILED') {
      throw new BadRequestException('Lote precisa estar aprovado antes da execução.');
    }
    if (!batch.executionApprovedAt) {
      throw new BadRequestException('Execução requer aprovação separada (finance_import_execute).');
    }
    if (batch.simulationStale) {
      throw new BadRequestException('Simulação desatualizada. Execute nova simulação.');
    }

    try {
      assertCanonicalImportAllowed(batch, {
        allowCanonicalWrite: opts.allowCanonicalWrite,
        allowPivotOverride: opts.allowPivotOverride,
      });
    } catch (e) {
      await this.audit.log({
        tenantId,
        eventType: 'finance_import_execute_blocked',
        actorUserId: opts.actorUserId,
        actorName: opts.actorName,
        metadata: {
          batchId,
          reason: pivotSafetyLockActive(batch) ? 'pivot_safety_lock' : 'canonical_write_disabled',
        },
      });
      throw e;
    }

    const lock = await this.acquireLock(batchId, tenantId, opts.actorUserId ?? null);
    if (!lock) {
      throw new ConflictException('Outro processo está executando este lote.');
    }

    const [rows, mappings] = await Promise.all([
      this.prisma.financeImportStagingRow.findMany({ where: { tenantId, batchId } }),
      this.prisma.financeImportBatchMapping.findMany({ where: { tenantId, batchId } }),
    ]);

    const readiness = batchReadiness({
      mappings: mappings as MappingRowLike[],
      rows: rows as never,
      simulationStale: batch.simulationStale,
      simulationSummary: batch.simulationSummary,
      controlTotalsMismatch: Boolean(
        (batch.controlTotals as { mismatch?: boolean } | null)?.mismatch,
      ),
    });
    if (!readiness.readyForImport) {
      await this.releaseLock(batchId);
      throw new BadRequestException(
        `Lote não está pronto para importação: ${readiness.blockingReasons.join(', ')}`,
      );
    }

    const map = new Map<string, MappingRowLike>();
    for (const m of mappings) map.set(mappingKey(m.mappingKind, m.sourceValueNormalized), m);

    const result: FinanceImportExecutionResult = {
      imported: 0,
      linked: 0,
      skipped: 0,
      failed: 0,
      pending: 0,
      errors: [],
    };

    await this.prisma.financeImportBatch.update({
      where: { id: batchId },
      data: { status: 'IMPORTING' },
    });

    for (const row of rows) {
      if (row.executionStatus === 'imported' || row.executionStatus === 'linked' || row.executionStatus === 'skipped') {
        if (row.executionStatus === 'imported') result.imported++;
        else if (row.executionStatus === 'linked') result.linked++;
        else result.skipped++;
        continue;
      }

      const ctx: ExecutionRowContext = {
        stagingRowId: row.id,
        batchId,
        tenantId,
        sheetName: row.sheetName,
        sourceRowNumber: row.sourceRowNumber,
        fingerprint: row.sourceRowFingerprint,
        classification: row.rowClassification,
        duplicateState: row.duplicateState,
        duplicateDecision: row.duplicateDecision,
        rowDecision: row.rowDecision,
        validationStatus: row.validationStatus,
        normalizedValues: (row.normalizedValues ?? {}) as Record<string, unknown>,
        possibleDuplicateLancamentoId: row.possibleDuplicateLancamentoId,
      };

      const skip = shouldSkipExecution(ctx);
      if (skip.skip) {
        await this.markRowSkipped(row.id, skip.reason, ctx, result);
        continue;
      }

      if (ctx.classification === 'INTERNAL_TRANSFER') {
        const blocked = await this.markRowFailed(row.id, 'transferencia_nao_resolvida', result);
        if (blocked) continue;
      }

      try {
        if (ctx.duplicateDecision === 'LINK_AND_SKIP' && ctx.possibleDuplicateLancamentoId) {
          await this.linkExisting(row, ctx, result, opts);
          continue;
        }

        await this.importRow(row, ctx, map, opts, result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Falha na linha';
        result.failed++;
        result.errors.push({ stagingRowId: row.id, message });
        await this.prisma.financeImportStagingRow.update({
          where: { id: row.id },
          data: { executionStatus: 'failed', executionError: message },
        });
      }
    }

    result.pending = rows.filter((r) => r.executionStatus === 'pending').length;

    const finalStatus = result.failed > 0 ? 'FAILED' : 'IMPORTED';
    await this.prisma.financeImportBatch.update({
      where: { id: batchId },
      data: {
        status: finalStatus,
        importedAt: result.failed === 0 ? new Date() : batch.importedAt,
        executionResult: result as unknown as Prisma.InputJsonValue,
        executionLockAt: null,
        executionLockByUserId: null,
        failureReason: result.failed ? `${result.failed} linha(s) com falha` : null,
      },
    });

    await this.audit.log({
      tenantId,
      eventType: result.failed ? 'finance_import_execute_failed' : 'finance_import_executed',
      actorUserId: opts.actorUserId,
      actorName: opts.actorName,
      metadata: { batchId, result },
    });

    return { pivotBlocked: false, result, batchId, safetyLock: pivotSafetyLockActive(batch) };
  }

  private async acquireLock(batchId: string, tenantId: string, userId: string | null) {
    const staleBefore = new Date(Date.now() - LOCK_STALE_MS);
    const updated = await this.prisma.financeImportBatch.updateMany({
      where: {
        id: batchId,
        tenantId,
        OR: [{ executionLockAt: null }, { executionLockAt: { lt: staleBefore } }],
      },
      data: { executionLockAt: new Date(), executionLockByUserId: userId },
    });
    return updated.count === 1;
  }

  private async releaseLock(batchId: string) {
    await this.prisma.financeImportBatch.update({
      where: { id: batchId },
      data: { executionLockAt: null, executionLockByUserId: null },
    });
  }

  private async markRowSkipped(
    rowId: string,
    reason: string,
    ctx: ExecutionRowContext,
    result: FinanceImportExecutionResult,
  ) {
    result.skipped++;
    const linkId =
      reason === 'link_and_skip' || reason === 'confirmed_duplicate'
        ? ctx.possibleDuplicateLancamentoId
        : null;
    await this.prisma.financeImportStagingRow.update({
      where: { id: rowId },
      data: {
        executionStatus: reason === 'link_and_skip' ? 'linked' : 'skipped',
        importedFinanceiroLancamentoId: linkId,
        executionError: reason,
        importedAt: new Date(),
      },
    });
    if (ctx.fingerprint && reason === 'confirmed_duplicate') {
      await this.ensureExternalLink(ctx.tenantId, ctx.fingerprint, linkId, ctx);
    }
  }

  private async markRowFailed(rowId: string, reason: string, result: FinanceImportExecutionResult) {
    result.skipped++;
    await this.prisma.financeImportStagingRow.update({
      where: { id: rowId },
      data: { executionStatus: 'skipped', executionError: reason },
    });
    return true;
  }

  private async linkExisting(
    row: { id: string; sourceRowFingerprint: string | null },
    ctx: ExecutionRowContext,
    result: FinanceImportExecutionResult,
    opts: FinanceImportExecuteOptions,
  ) {
    const lancId = ctx.possibleDuplicateLancamentoId!;
    await this.prisma.$transaction(async (tx) => {
      if (ctx.fingerprint) {
        await this.ensureExternalLinkTx(tx, ctx.tenantId, ctx.fingerprint, lancId, ctx);
      }
      await tx.financeImportStagingRow.update({
        where: { id: row.id },
        data: {
          executionStatus: 'linked',
          importedFinanceiroLancamentoId: lancId,
          importedAt: new Date(),
        },
      });
    });
    result.linked++;
    await this.audit.log({
      tenantId: ctx.tenantId,
      eventType: 'finance_import_row_linked',
      actorUserId: opts.actorUserId,
      actorName: opts.actorName,
      metadata: { batchId: ctx.batchId, stagingRowId: row.id, lancamentoId: lancId },
    });
  }

  private async importRow(
    row: { id: string; sourceRowFingerprint: string | null },
    ctx: ExecutionRowContext,
    mappings: Map<string, MappingRowLike>,
    opts: FinanceImportExecuteOptions,
    result: FinanceImportExecutionResult,
  ) {
    const payload = buildLancamentoPayload(ctx, mappings);
    if (!payload) {
      throw new BadRequestException('Mapeamento insuficiente para criar lançamento.');
    }

    const sourceId = `${ctx.batchId}:${ctx.stagingRowId}`;

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.financeiroLancamento.findFirst({
        where: {
          tenantId: ctx.tenantId,
          sourceModule: FINANCE_IMPORT_SOURCE_MODULE,
          sourceType: FINANCE_IMPORT_SOURCE_TYPE,
          sourceId,
        },
      });
      if (existing) {
        await tx.financeImportStagingRow.update({
          where: { id: row.id },
          data: {
            executionStatus: 'imported',
            importedFinanceiroLancamentoId: existing.id,
            importedAt: new Date(),
          },
        });
        return;
      }

      const lanc = await tx.financeiroLancamento.create({
        data: {
          tenantId: ctx.tenantId,
          tipo: payload.tipo,
          status: payload.status,
          ownershipKind: 'native',
          sourceModule: FINANCE_IMPORT_SOURCE_MODULE,
          sourceType: FINANCE_IMPORT_SOURCE_TYPE,
          sourceId,
          currency: 'BRL',
          contraparte: payload.contraparte,
          descricao: payload.descricao,
          valor: payload.valor,
          dueDate: payload.dueDate,
          settledAt: payload.settledAt,
          categoria: null,
          referencia: payload.documentNumber,
          notas: 'Importação histórica',
          recordOrigin: FINANCE_IMPORT_RECORD_ORIGIN,
          transactionKind: payload.transactionKind,
          financeAccountId: payload.financeAccountId,
          financeAccountSettledId: payload.financeAccountSettledId,
          financeCategoryId: payload.financeCategoryId,
          originalAmount: payload.originalAmount,
          interestAmount: payload.interestAmount,
          penaltyAmount: payload.penaltyAmount,
          discountAmount: payload.discountAmount,
          settlementAmount: payload.settlementAmount,
          documentType: payload.documentType,
          documentNumber: payload.documentNumber,
          amountSettledTotal: payload.valor,
          reconciliationStatus: payload.reconciliationStatus,
          createdByUserId: opts.actorUserId ?? null,
        },
      });

      const idempotencyKey = settlementIdempotencyKey(ctx.batchId, ctx.stagingRowId);
      const amountSettled = payload.settlementAmount ?? payload.valor;
      const finalAmount = computeSettlementFinal({
        amountSettled,
        interestAmount: payload.interestAmount ?? moneyDecimal(0),
        penaltyAmount: payload.penaltyAmount ?? moneyDecimal(0),
        discountAmount: payload.discountAmount ?? moneyDecimal(0),
        abatementAmount: moneyDecimal(0),
        otherAdjustmentAmount: moneyDecimal(0),
      });

      await tx.financeSettlement.create({
        data: {
          tenantId: ctx.tenantId,
          financeiroLancamentoId: lanc.id,
          idempotencyKey,
          settledAt: payload.settledAt ?? payload.dueDate,
          amountSettled,
          interestAmount: payload.interestAmount ?? moneyDecimal(0),
          penaltyAmount: payload.penaltyAmount ?? moneyDecimal(0),
          discountAmount: payload.discountAmount ?? moneyDecimal(0),
          finalAmount,
          actualFinanceAccountId: payload.financeAccountSettledId!,
          plannedFinanceAccountId: payload.financeAccountId,
          manualSettlement: true,
          manualReason: 'Importação histórica',
          performedByUserId: opts.actorUserId ?? null,
          performedByName: opts.actorName ?? null,
        },
      });

      if (ctx.fingerprint) {
        await this.ensureExternalLinkTx(tx, ctx.tenantId, ctx.fingerprint, lanc.id, ctx);
      }

      await tx.financeImportStagingRow.update({
        where: { id: row.id },
        data: {
          executionStatus: 'imported',
          importedFinanceiroLancamentoId: lanc.id,
          importedAt: new Date(),
        },
      });
    });

    result.imported++;
  }

  private async ensureExternalLink(
    tenantId: string,
    fingerprint: string,
    lancamentoId: string | null | undefined,
    ctx: ExecutionRowContext,
  ) {
    await this.ensureExternalLinkTx(this.prisma, tenantId, fingerprint, lancamentoId, ctx);
  }

  private async ensureExternalLinkTx(
    tx: Prisma.TransactionClient | PrismaService,
    tenantId: string,
    fingerprint: string,
    lancamentoId: string | null | undefined,
    ctx: ExecutionRowContext,
  ) {
    await tx.financeExternalLink.upsert({
      where: {
        tenantId_provider_externalObjectType_externalId: {
          tenantId,
          provider: 'spreadsheet_import',
          externalObjectType: 'row_fingerprint',
          externalId: fingerprint,
        },
      },
      create: {
        tenantId,
        provider: 'spreadsheet_import',
        externalObjectType: 'row_fingerprint',
        externalId: fingerprint,
        financeiroLancamentoId: lancamentoId ?? null,
        metadata: {
          batchId: ctx.batchId,
          sheetName: ctx.sheetName,
          sourceRowNumber: ctx.sourceRowNumber,
          origin: ctx.normalizedValues.applicationOrigin ?? null,
        } as Prisma.InputJsonValue,
      },
      update: {
        financeiroLancamentoId: lancamentoId ?? undefined,
      },
    });
  }
}
