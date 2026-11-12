import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OmieService } from '../../integrations/omie/omie.service';
import { FinanceAuditService } from '../finance-audit.service';
import type { FinanceOmieSyncType } from './finance-omie.types';
import {
  buildOmieExternalId,
  financeExternalLinkIdForOmie,
  sanitizeOmieSnapshot,
  snapshotHashFromRow,
} from './finance-omie-identity.util';
import { normalizeOmieTitulo } from './finance-omie-normalize.util';
import { matchOmieMirrorToCup360, type Cup360LancamentoLike } from './finance-omie-matching.util';

const MAX_PAGES_PER_RUN = 40;
const PAGE_SIZE = 100;

@Injectable()
export class FinanceOmieSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly omie: OmieService,
    private readonly audit: FinanceAuditService,
  ) {}

  async listBatches(tenantId: string, take = 20) {
    return this.prisma.financeOmieSyncBatch.findMany({
      where: { tenantId },
      orderBy: { startedAt: 'desc' },
      take,
    });
  }

  async runSync(
    tenantId: string,
    opts: {
      syncType: FinanceOmieSyncType;
      dateFrom?: string;
      dateTo?: string;
      actorUserId?: string | null;
      actorName?: string | null;
    },
  ) {
    const running = await this.prisma.financeOmieSyncBatch.findFirst({
      where: { tenantId, status: 'RUNNING' },
    });
    if (running) {
      throw new ConflictException('Já existe sincronização Omie em andamento para esta empresa.');
    }

    const statusOmie = await this.omie.getStatusForTenant(tenantId);
    if (!statusOmie.configured) {
      throw new BadRequestException('Credenciais Omie não configuradas para esta empresa.');
    }

    const batch = await this.prisma.financeOmieSyncBatch.create({
      data: {
        tenantId,
        status: 'RUNNING',
        syncType: opts.syncType,
        dateFrom: opts.dateFrom ? new Date(opts.dateFrom) : null,
        dateTo: opts.dateTo ? new Date(opts.dateTo) : null,
        startedByUserId: opts.actorUserId ?? null,
        startedByName: opts.actorName ?? null,
      },
    });

    await this.prisma.financeOmieTenantSyncState.upsert({
      where: { tenantId },
      create: {
        tenantId,
        lastSyncAttemptAt: new Date(),
        lastSyncStatus: 'RUNNING',
        lastSyncBatchId: batch.id,
      },
      update: {
        lastSyncAttemptAt: new Date(),
        lastSyncStatus: 'RUNNING',
        lastSyncBatchId: batch.id,
        lastSyncError: null,
      },
    });

    await this.audit.log({
      tenantId,
      eventType: 'finance_omie_sync_started',
      actorUserId: opts.actorUserId,
      actorName: opts.actorName,
      metadata: { batchId: batch.id, syncType: opts.syncType },
    });

    const warnings: string[] = [];
    let pagesProcessed = 0;
    let recordsRead = 0;
    let recordsNew = 0;
    let recordsUpdated = 0;
    let possibleMatches = 0;
    let conflicts = 0;
    let errors = 0;

    const filtros =
      opts.dateFrom || opts.dateTo
        ? {
            dataMovimentoDe: opts.dateFrom,
            dataMovimentoAte: opts.dateTo,
          }
        : undefined;

    try {
      if (opts.syncType === 'ap' || opts.syncType === 'both') {
        const r = await this.syncTituloTipo(tenantId, batch.id, 'pagar', 'ap', filtros);
        pagesProcessed += r.pages;
        recordsRead += r.read;
        recordsNew += r.created;
        recordsUpdated += r.updated;
        possibleMatches += r.possible;
        conflicts += r.conflicts;
        errors += r.errors;
        warnings.push(...r.warnings);
      }
      if (opts.syncType === 'ar' || opts.syncType === 'both') {
        const r = await this.syncTituloTipo(tenantId, batch.id, 'receber', 'ar', filtros);
        pagesProcessed += r.pages;
        recordsRead += r.read;
        recordsNew += r.created;
        recordsUpdated += r.updated;
        possibleMatches += r.possible;
        conflicts += r.conflicts;
        errors += r.errors;
        warnings.push(...r.warnings);
      }

      const finalStatus =
        errors > 0 ? 'FAILED' : warnings.length ? 'COMPLETED_WITH_WARNINGS' : 'COMPLETED';

      await this.prisma.financeOmieSyncBatch.update({
        where: { id: batch.id },
        data: {
          status: finalStatus,
          completedAt: new Date(),
          pagesProcessed,
          recordsRead,
          recordsNew,
          recordsUpdated,
          possibleMatches,
          conflicts,
          errors,
          warnings: warnings.length ? (warnings as unknown as Prisma.InputJsonValue) : undefined,
          errorSummary: errors ? `${errors} registro(s) sem identidade Omie` : null,
        },
      });

      await this.prisma.financeOmieTenantSyncState.upsert({
        where: { tenantId },
        create: {
          tenantId,
          lastSuccessfulSyncAt: finalStatus.startsWith('COMPLETED') ? new Date() : null,
          lastSyncAttemptAt: new Date(),
          lastSyncStatus: finalStatus,
          lastSyncBatchId: batch.id,
        },
        update: {
          lastSuccessfulSyncAt: finalStatus.startsWith('COMPLETED') ? new Date() : undefined,
          lastSyncAttemptAt: new Date(),
          lastSyncStatus: finalStatus,
          lastSyncBatchId: batch.id,
          lastSyncError: finalStatus === 'FAILED' ? 'Falha parcial na sincronização' : null,
        },
      });

      await this.audit.log({
        tenantId,
        eventType: finalStatus === 'FAILED' ? 'finance_omie_sync_failed' : 'finance_omie_sync_completed',
        actorUserId: opts.actorUserId,
        actorName: opts.actorName,
        metadata: { batchId: batch.id, finalStatus, recordsRead },
      });

      return this.prisma.financeOmieSyncBatch.findFirst({ where: { id: batch.id } });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Falha na sincronização Omie';
      await this.prisma.financeOmieSyncBatch.update({
        where: { id: batch.id },
        data: { status: 'FAILED', completedAt: new Date(), errorSummary: message },
      });
      await this.prisma.financeOmieTenantSyncState.upsert({
        where: { tenantId },
        create: {
          tenantId,
          lastSyncAttemptAt: new Date(),
          lastSyncStatus: 'FAILED',
          lastSyncError: message,
          lastSyncBatchId: batch.id,
        },
        update: {
          lastSyncAttemptAt: new Date(),
          lastSyncStatus: 'FAILED',
          lastSyncError: message,
          lastSyncBatchId: batch.id,
        },
      });
      throw e;
    }
  }

  private async syncTituloTipo(
    tenantId: string,
    batchId: string,
    tituloTipo: 'pagar' | 'receber',
    kind: 'ap' | 'ar',
    filtros?: { dataMovimentoDe?: string; dataMovimentoAte?: string },
  ) {
    const warnings: string[] = [];
    let pages = 0;
    let read = 0;
    let created = 0;
    let updated = 0;
    let possible = 0;
    let conflicts = 0;
    let errors = 0;

    const lancamentos = await this.prisma.financeiroLancamento.findMany({
      where: { tenantId, recordOrigin: { not: 'omie' } },
      take: 5000,
      select: {
        id: true,
        tenantId: true,
        tipo: true,
        valor: true,
        dueDate: true,
        settledAt: true,
        status: true,
        referencia: true,
        documentNumber: true,
        contraparte: true,
        supplierId: true,
        customerId: true,
        recordOrigin: true,
      },
    });

    const keepSeparate = await this.prisma.financeOmieReconciliationDecision.findMany({
      where: { tenantId, decision: 'KEEP_SEPARATE' },
      select: { mirrorRecordId: true, financeiroLancamentoId: true },
    });
    const mirrorIds = [...new Set(keepSeparate.map((d) => d.mirrorRecordId))];
    const mirrorById = new Map(
      (
        await this.prisma.financeOmieMirrorRecord.findMany({
          where: { tenantId, id: { in: mirrorIds } },
          select: { id: true, omieExternalId: true },
        })
      ).map((m) => [m.id, m.omieExternalId]),
    );
    const keepSet = new Set(
      keepSeparate.map(
        (d) => `${mirrorById.get(d.mirrorRecordId) ?? d.mirrorRecordId}::${d.financeiroLancamentoId ?? ''}`,
      ),
    );

    for (let pagina = 1; pagina <= MAX_PAGES_PER_RUN; pagina++) {
      const list =
        kind === 'ap'
          ? await this.omie.listContasPagar(tenantId, {
              pagina,
              registrosPorPagina: PAGE_SIZE,
              filtro: 'todos',
              filtrosRelatorio: filtros,
            })
          : await this.omie.listContasReceber(tenantId, {
              pagina,
              registrosPorPagina: PAGE_SIZE,
              filtro: 'todos',
              filtrosRelatorio: filtros,
            });

      pages++;
      if (!list.ok) {
        warnings.push(list.message ?? 'Falha ao listar Omie');
        break;
      }
      if (!list.items.length) break;

      for (const row of list.items) {
        read++;
        const normalized = normalizeOmieTitulo(row, tituloTipo);
        if (!normalized) {
          errors++;
          continue;
        }
        const omieExternalId = buildOmieExternalId(
          tituloTipo,
          normalized.omieLancamentoId,
          normalized.omieIntegracaoCode,
        );
        if (!omieExternalId) {
          errors++;
          continue;
        }

        const linkMeta = financeExternalLinkIdForOmie(
          tituloTipo,
          normalized.omieLancamentoId,
          normalized.omieIntegracaoCode,
        );

        let existingLink: { financeiroLancamentoId: string | null; externalId: string; externalObjectType: string } | null =
          null;
        if (linkMeta) {
          const link = await this.prisma.financeExternalLink.findUnique({
            where: {
              tenantId_provider_externalObjectType_externalId: {
                tenantId,
                provider: 'omie',
                externalObjectType: linkMeta.externalObjectType,
                externalId: linkMeta.externalId,
              },
            },
          });
          if (link) {
            existingLink = {
              financeiroLancamentoId: link.financeiroLancamentoId,
              externalId: link.externalId,
              externalObjectType: link.externalObjectType,
            };
          }
        }

        const existingMirror = await this.prisma.financeOmieMirrorRecord.findUnique({
          where: { tenantId_omieExternalId: { tenantId, omieExternalId } },
        });

        const hash = snapshotHashFromRow(row);
        const sanitized = sanitizeOmieSnapshot(row);

        const match = matchOmieMirrorToCup360({
          tituloTipo,
          normalized,
          omieExternalId,
          existingLink,
          candidateLancamentos: lancamentos as Cup360LancamentoLike[],
          keepSeparatePairIds: keepSet,
          linkedLancamentoId: existingMirror?.financeiroLancamentoId ?? existingLink?.financeiroLancamentoId ?? null,
        });

        if (match.matchLevel === 'POSSIBLE_MATCH' || match.matchLevel === 'STRONG_CANDIDATE') possible++;
        if (match.matchLevel === 'CONFLICT') conflicts++;

        const changeSummary =
          existingMirror && existingMirror.snapshotHash && existingMirror.snapshotHash !== hash
            ? { previousHash: existingMirror.snapshotHash, nextHash: hash }
            : undefined;

        if (existingMirror) {
          updated++;
          await this.prisma.financeOmieMirrorRecord.update({
            where: { id: existingMirror.id },
            data: {
              syncBatchId: batchId,
              normalizedData: normalized as unknown as Prisma.InputJsonValue,
              snapshotHash: hash,
              snapshotSanitized: sanitized as Prisma.InputJsonValue,
              omieReconciliationState: match.omieReconciliationState,
              matchLevel: match.matchLevel,
              matchReason: match.matchReason,
              financeiroLancamentoId:
                existingMirror.financeiroLancamentoId ??
                existingLink?.financeiroLancamentoId ??
                match.candidateLancamentoId,
              supplierOmieId: normalized.supplierOmieId,
              customerOmieId: normalized.customerOmieId,
              lastSyncedAt: new Date(),
              changeDetectedAt: changeSummary ? new Date() : existingMirror.changeDetectedAt,
              changeSummary: changeSummary as Prisma.InputJsonValue,
            },
          });
        } else {
          created++;
          await this.prisma.financeOmieMirrorRecord.create({
            data: {
              tenantId,
              syncBatchId: batchId,
              tituloTipo,
              omieExternalId,
              omieLancamentoId: normalized.omieLancamentoId,
              omieIntegracaoCode: normalized.omieIntegracaoCode,
              normalizedData: normalized as unknown as Prisma.InputJsonValue,
              snapshotHash: hash,
              snapshotSanitized: sanitized as Prisma.InputJsonValue,
              omieReconciliationState: match.omieReconciliationState,
              matchLevel: match.matchLevel,
              matchReason: match.matchReason,
              financeiroLancamentoId: existingLink?.financeiroLancamentoId ?? match.candidateLancamentoId,
              supplierOmieId: normalized.supplierOmieId,
              customerOmieId: normalized.customerOmieId,
            },
          });
        }

        if (linkMeta) {
          await this.prisma.financeExternalLink.upsert({
            where: {
              tenantId_provider_externalObjectType_externalId: {
                tenantId,
                provider: 'omie',
                externalObjectType: linkMeta.externalObjectType,
                externalId: linkMeta.externalId,
              },
            },
            create: {
              tenantId,
              provider: 'omie',
              externalObjectType: linkMeta.externalObjectType,
              externalId: linkMeta.externalId,
              financeiroLancamentoId: existingLink?.financeiroLancamentoId ?? null,
              metadata: { omieExternalId, tituloTipo, syncBatchId: batchId } as Prisma.InputJsonValue,
            },
            update: {
              metadata: { omieExternalId, tituloTipo, syncBatchId: batchId } as Prisma.InputJsonValue,
            },
          });
        }
      }

      if (list.items.length < PAGE_SIZE) break;
      if (pagina >= Math.ceil((list.total ?? 0) / PAGE_SIZE)) break;
    }

    return { pages, read, created, updated, possible, conflicts, errors, warnings };
  }
}
