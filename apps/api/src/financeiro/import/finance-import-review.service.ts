import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FinanceAuditService } from '../finance-audit.service';
import {
  buildBulkMappingSections,
  buildDuplicateReviewItem,
  listConflictRows,
} from './finance-import-review.util';
import type { MappingRowLike } from './finance-import-readiness.util';

@Injectable()
export class FinanceImportReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: FinanceAuditService,
  ) {}

  private async requireBatch(tenantId: string, batchId: string) {
    const batch = await this.prisma.financeImportBatch.findFirst({ where: { id: batchId, tenantId } });
    if (!batch) throw new NotFoundException('Lote não encontrado.');
    return batch;
  }

  async getBulkMappings(tenantId: string, batchId: string) {
    await this.requireBatch(tenantId, batchId);
    const [mappings, rows] = await Promise.all([
      this.prisma.financeImportBatchMapping.findMany({ where: { tenantId, batchId } }),
      this.prisma.financeImportStagingRow.findMany({
        where: { tenantId, batchId },
        select: { normalizedValues: true },
      }),
    ]);
    return buildBulkMappingSections(mappings, rows);
  }

  async listPossibleDuplicates(tenantId: string, batchId: string) {
    await this.requireBatch(tenantId, batchId);
    const rows = await this.prisma.financeImportStagingRow.findMany({
      where: {
        tenantId,
        batchId,
        duplicateState: { in: ['possible_duplicate_cup360', 'exact_in_batch', 'exact_file_reprocess'] },
      },
      orderBy: { sourceRowNumber: 'asc' },
    });
    const lancamentoIds = rows
      .map((r) => r.possibleDuplicateLancamentoId)
      .filter((id): id is string => Boolean(id));
    const existing =
      lancamentoIds.length > 0
        ? await this.prisma.financeiroLancamento.findMany({
            where: { tenantId, id: { in: lancamentoIds } },
          })
        : [];
    const byId = new Map(existing.map((e) => [e.id, e]));
    return rows.map((r) =>
      buildDuplicateReviewItem(
        r,
        r.possibleDuplicateLancamentoId ? byId.get(r.possibleDuplicateLancamentoId) ?? null : null,
      ),
    );
  }

  async listConflicts(tenantId: string, batchId: string) {
    await this.requireBatch(tenantId, batchId);
    const [rows, mappings] = await Promise.all([
      this.prisma.financeImportStagingRow.findMany({ where: { tenantId, batchId } }),
      this.prisma.financeImportBatchMapping.findMany({ where: { tenantId, batchId } }),
    ]);
    return listConflictRows(rows, mappings as MappingRowLike[]);
  }

  async updateRowDecisions(
    tenantId: string,
    batchId: string,
    updates: Array<{ stagingRowId: string; rowDecision: string; reason?: string }>,
    actorUserId: string | null,
    actorName: string | null,
  ) {
    await this.requireBatch(tenantId, batchId);
    for (const u of updates) {
      await this.prisma.financeImportStagingRow.updateMany({
        where: { id: u.stagingRowId, batchId, tenantId },
        data: {
          rowDecision: u.rowDecision,
          rowDecisionReason: u.reason?.trim() || null,
        },
      });
    }
    await this.prisma.financeImportBatch.update({
      where: { id: batchId },
      data: { simulationStale: true },
    });
    await this.audit.log({
      tenantId,
      eventType: 'finance_import_row_decision',
      actorUserId,
      actorName,
      metadata: { batchId, count: updates.length },
    });
    return { ok: true };
  }

  async updateDuplicateDecisions(
    tenantId: string,
    batchId: string,
    updates: Array<{
      stagingRowId: string;
      duplicateDecision: 'LINK_AND_SKIP' | 'IMPORT_SEPARATELY' | 'KEEP_FOR_REVIEW';
      reason?: string;
      linkLancamentoId?: string;
    }>,
    actorUserId: string | null,
    actorName: string | null,
  ) {
    await this.requireBatch(tenantId, batchId);
    for (const u of updates) {
      const data: Record<string, unknown> = {
        duplicateDecision: u.duplicateDecision,
        duplicateDecisionReason: u.reason?.trim() || null,
      };
      if (u.duplicateDecision === 'LINK_AND_SKIP' && u.linkLancamentoId) {
        data.possibleDuplicateLancamentoId = u.linkLancamentoId;
      }
      await this.prisma.financeImportStagingRow.updateMany({
        where: { id: u.stagingRowId, batchId, tenantId },
        data,
      });
    }
    await this.prisma.financeImportBatch.update({
      where: { id: batchId },
      data: { simulationStale: true },
    });
    await this.audit.log({
      tenantId,
      eventType: 'finance_import_duplicate_decision',
      actorUserId,
      actorName,
      metadata: { batchId, count: updates.length },
    });
    return { ok: true };
  }

  async approveExecution(
    tenantId: string,
    batchId: string,
    actorUserId: string | null,
    actorName: string | null,
  ) {
    const batch = await this.requireBatch(tenantId, batchId);
    if (batch.status !== 'APPROVED') {
      throw new BadRequestException('Lote precisa estar aprovado para liberar execução.');
    }
    if (batch.simulationStale) {
      throw new BadRequestException('Simulação desatualizada. Simule novamente após revisão.');
    }
    await this.prisma.financeImportBatch.update({
      where: { id: batchId },
      data: {
        executionApprovedAt: new Date(),
        executionApprovedByUserId: actorUserId,
        executionApprovedByName: actorName,
      },
    });
    await this.audit.log({
      tenantId,
      eventType: 'finance_import_execution_approved',
      actorUserId,
      actorName,
      metadata: { batchId },
    });
    return this.prisma.financeImportBatch.findFirst({ where: { id: batchId, tenantId } });
  }

  async getExecutionResults(tenantId: string, batchId: string) {
    const batch = await this.requireBatch(tenantId, batchId);
    const counts = await this.prisma.financeImportStagingRow.groupBy({
      by: ['executionStatus'],
      where: { tenantId, batchId },
      _count: { _all: true },
    });
    return {
      batch: {
        id: batch.id,
        status: batch.status,
        executionResult: batch.executionResult,
        importedAt: batch.importedAt,
        executionApprovedAt: batch.executionApprovedAt,
        executionApprovedByName: batch.executionApprovedByName,
      },
      byExecutionStatus: counts,
    };
  }
}
