import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { S3Service } from '../../s3/s3.service';
import { FinanceAuditService } from '../finance-audit.service';
import { sha256Buffer } from './finance-import-hash.util';
import {
  PIVOT_PAGAMENTOS_ADAPTER_ID,
  detectPivotPagamentosWorkbook,
  normalizeTaxId,
  parsePivotPagamentosSheet,
} from './finance-import-pivot-pagamentos.parser';
import * as XLSX from 'xlsx';
import {
  collectMappingCandidates,
  mappingKindBlockedForAutoConfirm,
  type MappingCandidate,
} from './finance-import-mapping.util';
import { FinanceImportSimulationService } from './finance-import-simulation.service';
import type { FinanceImportSimulationSummary } from './finance-import.types';
import { classifyPossibleDuplicate, detectExactFileReprocess } from './finance-import-duplicate.util';

@Injectable()
export class FinanceImportBatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly audit: FinanceAuditService,
    private readonly simulation: FinanceImportSimulationService,
  ) {}

  async upload(
    tenantId: string,
    file: Buffer,
    filename: string,
    mimeType: string | undefined,
    actorUserId: string | null,
    actorName: string | null,
  ) {
    const fileHash = sha256Buffer(file);
    const dup = await this.prisma.financeImportBatch.findUnique({
      where: { tenantId_fileHash: { tenantId, fileHash } },
    });
    if (dup) {
      throw new ConflictException({
        message: 'Este arquivo já foi enviado (mesmo hash SHA-256).',
        batchId: dup.id,
        status: dup.status,
      });
    }

    const { key } = await this.s3.uploadFinancePrivateFile(
      file,
      tenantId,
      filename || 'import.xlsx',
      mimeType ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    const sourceType = this.detectSourceType(file);
    const batch = await this.prisma.financeImportBatch.create({
      data: {
        tenantId,
        sourceType,
        originalFilename: filename,
        fileHash,
        fileKey: key,
        mimeType: mimeType ?? null,
        status: 'UPLOADED',
        uploadedByUserId: actorUserId,
        uploadedByName: actorName,
      },
    });

    await this.audit.log({
      tenantId,
      eventType: 'finance_import_uploaded',
      actorUserId,
      actorName,
      metadata: { batchId: batch.id, fileHash, filename, sourceType },
    });

    return batch;
  }

  private detectSourceType(file: Buffer): string {
    try {
      const wb = XLSX.read(file, { type: 'buffer', bookSheets: true });
      if (detectPivotPagamentosWorkbook(wb)) return PIVOT_PAGAMENTOS_ADAPTER_ID;
    } catch {
      // ignore
    }
    return 'xlsx_unknown';
  }

  async analyze(tenantId: string, batchId: string, actorUserId: string | null, actorName: string | null) {
    const batch = await this.requireBatch(tenantId, batchId);
    if (!batch.fileKey) throw new BadRequestException('Arquivo do lote não encontrado.');

    const buffer = await this.s3.getObjectBuffer(batch.fileKey);
    const parsed =
      batch.sourceType === PIVOT_PAGAMENTOS_ADAPTER_ID
        ? parsePivotPagamentosSheet(buffer)
        : parsePivotPagamentosSheet(buffer);

  const semanticRows = parsed.map((p) => p.semantic);
    const mappingCandidates = collectMappingCandidates(semanticRows);

    const tenantByTax = await this.resolveTenantCandidates(parsed.map((p) => p.semantic));

    const fingerprintSeen = new Set<string>();
  const stagingData: Prisma.FinanceImportStagingRowCreateManyInput[] = [];

    let valid = 0;
    let warning = 0;
    let conflict = 0;
    let invalid = 0;

    for (const row of parsed) {
      let duplicateState = row.duplicateState;
      if (fingerprintSeen.has(row.fingerprint)) {
        duplicateState = 'exact_in_batch';
      } else {
        fingerprintSeen.add(row.fingerprint);
      }

      const existing = await this.prisma.financeExternalLink.findFirst({
        where: {
          tenantId,
          provider: 'spreadsheet_import',
          externalObjectType: 'row_fingerprint',
          externalId: row.fingerprint,
        },
        select: { id: true, provider: true, externalId: true, financeiroLancamentoId: true },
      });
      if (existing) {
        duplicateState = classifyPossibleDuplicate({
          provider: existing.provider,
          externalId: existing.externalId,
        });
      }

      if (duplicateState === 'possible_duplicate_cup360') conflict++;
      if (row.validationStatus === 'valid') valid++;
      else if (row.validationStatus === 'warning') warning++;
      else if (row.validationStatus === 'conflict') conflict++;
      else invalid++;

      stagingData.push({
        batchId,
        tenantId,
        sheetName: 'Pagamentos',
        sourceRowNumber: row.sourceRowNumber,
        rawValues: row.rawByHeader as Prisma.InputJsonValue,
        normalizedValues: row.semantic as Prisma.InputJsonValue,
        rowClassification: row.classification,
        validationStatus: row.validationStatus,
        warnings: row.warnings as Prisma.InputJsonValue,
        errors: row.errors as Prisma.InputJsonValue,
        duplicateState,
        sourceRowFingerprint: row.fingerprint,
        proposedMappings: {
          tenantCandidates: tenantByTax.get(String(row.semantic.companyTaxIdNormalized ?? '')) ?? [],
        } as Prisma.InputJsonValue,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.financeImportStagingRow.deleteMany({ where: { batchId } });
      await tx.financeImportBatchMapping.deleteMany({ where: { batchId } });
      if (stagingData.length) {
        await tx.financeImportStagingRow.createMany({ data: stagingData });
      }
      await this.upsertMappingCandidates(tx, batchId, tenantId, mappingCandidates, tenantByTax);
      const status = mappingCandidates.some((m) => mappingKindBlockedForAutoConfirm(m.mappingKind))
        ? 'MAPPING_REQUIRED'
        : 'ANALYZED';
      await tx.financeImportBatch.update({
        where: { id: batchId },
        data: {
          status,
          totalRows: stagingData.length,
          validRows: valid,
          warningRows: warning,
          conflictRows: conflict,
          invalidRows: invalid,
        },
      });
    });

    await this.audit.log({
      tenantId,
      eventType: 'finance_import_analyzed',
      actorUserId,
      actorName,
      metadata: { batchId, totalRows: stagingData.length, valid, warning, conflict, invalid },
    });

    return this.getBatchDetail(tenantId, batchId);
  }

  private async resolveTenantCandidates(semanticRows: Array<Record<string, unknown>>) {
    const taxIds = new Set<string>();
    for (const row of semanticRows) {
      const id = normalizeTaxId(row.companyTaxId);
      if (id) taxIds.add(id);
    }
    const map = new Map<string, Array<{ id: string; name: string; taxId: string | null }>>();
    if (!taxIds.size) return map;
    const tenants = await this.prisma.tenant.findMany({
      where: { taxId: { in: [...taxIds] } },
      select: { id: true, name: true, taxId: true },
    });
    for (const t of tenants) {
      const key = (t.taxId ?? '').replace(/\D/g, '');
      if (!key) continue;
      const prev = map.get(key) ?? [];
      prev.push({ id: t.id, name: t.name, taxId: t.taxId });
      map.set(key, prev);
    }
    return map;
  }

  private async upsertMappingCandidates(
    tx: Prisma.TransactionClient,
    batchId: string,
    tenantId: string,
    candidates: MappingCandidate[],
    tenantByTax: Map<string, unknown>,
  ) {
    for (const c of candidates) {
      let action: string = 'review_required';
      let targetId: string | null = null;
      let confirmed = false;

      if (c.mappingKind === 'company') {
        const matches = tenantByTax.get(c.sourceValue.replace(/\D/g, ''));
        if (Array.isArray(matches) && matches.length === 1) {
          action = 'map_existing';
          targetId = (matches[0] as { id: string }).id;
        } else if (Array.isArray(matches) && matches.length > 1) {
          action = 'review_required';
        } else {
          action = 'review_required';
        }
      }

      if (mappingKindBlockedForAutoConfirm(c.mappingKind)) {
        confirmed = false;
      }

      await tx.financeImportBatchMapping.upsert({
        where: {
          batchId_mappingKind_sourceValueNormalized: {
            batchId,
            mappingKind: c.mappingKind,
            sourceValueNormalized: c.sourceValueNormalized,
          },
        },
        create: {
          batchId,
          tenantId,
          mappingKind: c.mappingKind,
          sourceValue: c.sourceValue,
          sourceValueNormalized: c.sourceValueNormalized,
          action,
          targetId,
          confirmed,
        },
        update: {
          sourceValue: c.sourceValue,
          action,
          targetId,
          confirmed,
        },
      });
    }
  }

  async listBatches(tenantId: string) {
    return this.prisma.financeImportBatch.findMany({
      where: { tenantId },
      orderBy: { uploadedAt: 'desc' },
      take: 50,
    });
  }

  async getBatchDetail(tenantId: string, batchId: string) {
    const batch = await this.requireBatch(tenantId, batchId);
    const mappings = await this.prisma.financeImportBatchMapping.findMany({
      where: { batchId },
      orderBy: [{ mappingKind: 'asc' }, { sourceValue: 'asc' }],
    });
    return { batch, mappings };
  }

  async listStagingRows(
    tenantId: string,
    batchId: string,
    filters?: { validationStatus?: string; classification?: string; duplicateState?: string },
    page = 1,
    pageSize = 50,
  ) {
    await this.requireBatch(tenantId, batchId);
    const where: Prisma.FinanceImportStagingRowWhereInput = {
      tenantId,
      batchId,
      ...(filters?.validationStatus ? { validationStatus: filters.validationStatus } : {}),
      ...(filters?.classification ? { rowClassification: filters.classification } : {}),
      ...(filters?.duplicateState ? { duplicateState: filters.duplicateState } : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.financeImportStagingRow.count({ where }),
      this.prisma.financeImportStagingRow.findMany({
        where,
        orderBy: { sourceRowNumber: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { total, page, pageSize, items };
  }

  async updateMappings(
    tenantId: string,
    batchId: string,
    updates: Array<{
      id: string;
      action?: string;
      targetType?: string;
      targetId?: string;
      confirmed?: boolean;
      notes?: string;
    }>,
    actorUserId: string | null,
    actorName: string | null,
  ) {
    await this.requireBatch(tenantId, batchId);
    for (const u of updates) {
      const row = await this.prisma.financeImportBatchMapping.findFirst({
        where: { id: u.id, batchId, tenantId },
      });
      if (!row) continue;
      await this.prisma.financeImportBatchMapping.update({
        where: { id: row.id },
        data: {
          action: u.action ?? row.action,
          targetType: u.targetType ?? row.targetType,
          targetId: u.targetId ?? row.targetId,
          confirmed: u.confirmed ?? row.confirmed,
          notes: u.notes ?? row.notes,
        },
      });
    }
    await this.audit.log({
      tenantId,
      eventType: 'finance_import_mapping_changed',
      actorUserId,
      actorName,
      metadata: { batchId, count: updates.length },
    });
    return this.getBatchDetail(tenantId, batchId);
  }

  async simulate(tenantId: string, batchId: string, actorUserId: string | null, actorName: string | null) {
    await this.requireBatch(tenantId, batchId);
    const [rows, mappings] = await Promise.all([
      this.prisma.financeImportStagingRow.findMany({ where: { tenantId, batchId } }),
      this.prisma.financeImportBatchMapping.findMany({ where: { tenantId, batchId } }),
    ]);

    const unresolved = mappings.filter(
      (m) => m.action !== 'ignore' && (!m.confirmed || !m.targetId),
    ).length;

    const summary = this.simulation.simulate(
      rows.map((r) => ({
        rowClassification: r.rowClassification,
        validationStatus: r.validationStatus,
        duplicateState: r.duplicateState,
      })),
      unresolved,
    );

    const status = unresolved > 0 ? 'MAPPING_REQUIRED' : 'READY_FOR_REVIEW';
    await this.prisma.financeImportBatch.update({
      where: { id: batchId },
      data: {
        status,
        lastSimulationAt: new Date(),
        simulationSummary: summary as unknown as Prisma.InputJsonValue,
      },
    });

    await this.audit.log({
      tenantId,
      eventType: 'finance_import_simulated',
      actorUserId,
      actorName,
      metadata: { batchId, summary },
    });

    return summary as FinanceImportSimulationSummary;
  }

  async approve(tenantId: string, batchId: string, actorUserId: string | null, actorName: string | null) {
    const batch = await this.requireBatch(tenantId, batchId);
    if (batch.status !== 'READY_FOR_REVIEW' && batch.status !== 'MAPPING_REQUIRED') {
      throw new BadRequestException('Lote não está pronto para aprovação.');
    }

    const mappings = await this.prisma.financeImportBatchMapping.findMany({ where: { tenantId, batchId } });
    const unresolved = mappings.filter(
      (m) => m.action !== 'ignore' && (!m.confirmed || (m.action === 'map_existing' && !m.targetId)),
    );
    if (unresolved.length) {
      throw new BadRequestException('Há mapeamentos pendentes. Resolva antes de aprovar.');
    }

    if (!batch.simulationSummary) {
      throw new BadRequestException('Execute a simulação antes de aprovar.');
    }

    await this.prisma.financeImportBatch.update({
      where: { id: batchId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedByUserId: actorUserId,
        approvedByName: actorName,
      },
    });

    await this.audit.log({
      tenantId,
      eventType: 'finance_import_approved',
      actorUserId,
      actorName,
      metadata: { batchId },
    });

    return this.getBatchDetail(tenantId, batchId);
  }

  async cancel(tenantId: string, batchId: string) {
    await this.requireBatch(tenantId, batchId);
    return this.prisma.financeImportBatch.update({
      where: { id: batchId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
  }

  private async requireBatch(tenantId: string, batchId: string) {
    const batch = await this.prisma.financeImportBatch.findFirst({ where: { id: batchId, tenantId } });
    if (!batch) throw new NotFoundException('Lote não encontrado.');
    return batch;
  }

  assertSameFileHash(existing: string, incoming: string) {
    return detectExactFileReprocess(existing, incoming);
  }
}
