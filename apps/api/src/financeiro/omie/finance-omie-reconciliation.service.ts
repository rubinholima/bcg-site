import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { FinanceAuditService } from '../finance-audit.service';
import { financeExternalLinkIdForOmie } from './finance-omie-identity.util';
import type { FinanceOmieNormalizedTitulo } from './finance-omie.types';
import { decimalToNumber } from './finance-omie-matching.util';
import { crosscheckSpreadsheetRowAgainstOmie } from './finance-omie-import-crosscheck.util';

@Injectable()
export class FinanceOmieReconciliationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: FinanceAuditService,
  ) {}

  async getSummary(tenantId: string) {
    const groups = await this.prisma.financeOmieMirrorRecord.groupBy({
      by: ['tituloTipo', 'omieReconciliationState'],
      where: { tenantId },
      _count: { _all: true },
    });
    const cup360Unlinked = await this.prisma.financeiroLancamento.count({
      where: {
        tenantId,
        recordOrigin: { in: ['manual_cup360', 'cup360_module', 'finance_historical_import'] },
        financeExternalLinks: { none: { provider: 'omie' } },
      },
    });
    return { groups, cup360WithoutOmieLink: cup360Unlinked };
  }

  async listMirrors(
    tenantId: string,
    filters?: { tituloTipo?: string; state?: string; matchLevel?: string },
    page = 1,
    pageSize = 50,
  ) {
    const where: Prisma.FinanceOmieMirrorRecordWhereInput = {
      tenantId,
      ...(filters?.tituloTipo ? { tituloTipo: filters.tituloTipo } : {}),
      ...(filters?.state ? { omieReconciliationState: filters.state } : {}),
      ...(filters?.matchLevel ? { matchLevel: filters.matchLevel } : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.financeOmieMirrorRecord.count({ where }),
      this.prisma.financeOmieMirrorRecord.findMany({
        where,
        orderBy: { lastSyncedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { total, page, pageSize, items };
  }

  async getMirrorDetail(tenantId: string, mirrorId: string) {
    const mirror = await this.prisma.financeOmieMirrorRecord.findFirst({
      where: { id: mirrorId, tenantId },
    });
    if (!mirror) throw new NotFoundException('Registro espelho Omie não encontrado.');
    const lancamento = mirror.financeiroLancamentoId
      ? await this.prisma.financeiroLancamento.findFirst({
          where: { id: mirror.financeiroLancamentoId, tenantId },
        })
      : null;
    return { mirror, lancamento, sideBySide: buildSideBySide(mirror, lancamento) };
  }

  async listReconciliationQueue(tenantId: string) {
    return this.prisma.financeOmieMirrorRecord.findMany({
      where: {
        tenantId,
        matchLevel: { in: ['STRONG_CANDIDATE', 'POSSIBLE_MATCH', 'CONFLICT'] },
        omieReconciliationState: { not: 'KEEP_SEPARATE' },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  async linkMirror(
    tenantId: string,
    mirrorId: string,
    financeiroLancamentoId: string,
    actorUserId: string | null,
    actorName: string | null,
    reason?: string,
  ) {
    const mirror = await this.prisma.financeOmieMirrorRecord.findFirst({ where: { id: mirrorId, tenantId } });
    if (!mirror) throw new NotFoundException('Espelho Omie não encontrado.');
    const lanc = await this.prisma.financeiroLancamento.findFirst({
      where: { id: financeiroLancamentoId, tenantId },
    });
    if (!lanc) throw new BadRequestException('Lançamento CUP360 inválido para este tenant.');

    const normalized = mirror.normalizedData as FinanceOmieNormalizedTitulo;
    const linkMeta = financeExternalLinkIdForOmie(
      mirror.tituloTipo as 'pagar' | 'receber',
      normalized.omieLancamentoId,
      normalized.omieIntegracaoCode,
    );
    if (!linkMeta) throw new BadRequestException('Identidade Omie insuficiente para vínculo.');

    const conflict = await this.prisma.financeExternalLink.findFirst({
      where: {
        tenantId,
        provider: 'omie',
        externalObjectType: linkMeta.externalObjectType,
        externalId: linkMeta.externalId,
        financeiroLancamentoId: { not: null },
        NOT: { financeiroLancamentoId },
      },
    });
    if (conflict) {
      throw new BadRequestException('Mesmo ID Omie já vinculado a outro lançamento CUP360.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.financeExternalLink.upsert({
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
          financeiroLancamentoId,
          metadata: { linkedBy: 'reconciliation', mirrorId } as Prisma.InputJsonValue,
        },
        update: { financeiroLancamentoId },
      });
      await tx.financeOmieMirrorRecord.update({
        where: { id: mirror.id },
        data: {
          financeiroLancamentoId,
          omieReconciliationState: 'LINKED',
          matchLevel: 'CONFIRMED_IDENTITY',
          matchReason: reason?.trim() || 'Vínculo manual aprovado.',
        },
      });
      await tx.financeOmieReconciliationDecision.create({
        data: {
          tenantId,
          mirrorRecordId: mirror.id,
          financeiroLancamentoId,
          decision: 'LINK',
          reason: reason?.trim() || null,
          actorUserId,
          actorName,
        },
      });
    });

    await this.audit.log({
      tenantId,
      eventType: 'finance_omie_reconcile_link',
      actorUserId,
      actorName,
      metadata: { mirrorId, financeiroLancamentoId, omieExternalId: mirror.omieExternalId },
    });

    return { ok: true };
  }

  async keepSeparate(
    tenantId: string,
    mirrorId: string,
    financeiroLancamentoId: string | null,
    actorUserId: string | null,
    actorName: string | null,
    reason?: string,
  ) {
    const mirror = await this.prisma.financeOmieMirrorRecord.findFirst({ where: { id: mirrorId, tenantId } });
    if (!mirror) throw new NotFoundException('Espelho Omie não encontrado.');

    await this.prisma.$transaction(async (tx) => {
      await tx.financeOmieMirrorRecord.update({
        where: { id: mirror.id },
        data: {
          omieReconciliationState: 'KEEP_SEPARATE',
          matchReason: reason?.trim() || 'Manter separado pelo revisor.',
        },
      });
      await tx.financeOmieReconciliationDecision.create({
        data: {
          tenantId,
          mirrorRecordId: mirror.id,
          financeiroLancamentoId,
          decision: 'KEEP_SEPARATE',
          reason: reason?.trim() || null,
          actorUserId,
          actorName,
        },
      });
    });

    await this.audit.log({
      tenantId,
      eventType: 'finance_omie_reconcile_keep_separate',
      actorUserId,
      actorName,
      metadata: { mirrorId, financeiroLancamentoId },
    });

    return { ok: true };
  }

  async importOmieCrosscheck(tenantId: string, batchId: string) {
    await this.prisma.financeImportBatch.findFirstOrThrow({ where: { id: batchId, tenantId } });
    const rows = await this.prisma.financeImportStagingRow.findMany({
      where: { tenantId, batchId },
      select: { id: true, sourceRowNumber: true, normalizedValues: true },
      take: 5000,
    });
    const mirrors = await this.prisma.financeOmieMirrorRecord.findMany({
      where: { tenantId },
      select: { id: true, omieExternalId: true, normalizedData: true, financeiroLancamentoId: true },
      take: 10000,
    });
    return rows.map((r) => ({
      stagingRowId: r.id,
      sourceRowNumber: r.sourceRowNumber,
      ...crosscheckSpreadsheetRowAgainstOmie((r.normalizedValues ?? {}) as Record<string, unknown>, mirrors),
    }));
  }
}

function buildSideBySide(
  mirror: { normalizedData: unknown; omieExternalId: string; tituloTipo: string; matchLevel: string },
  lanc: {
    contraparte: string | null;
    referencia: string | null;
    documentNumber: string | null;
    valor: unknown;
    dueDate: Date;
    settledAt: Date | null;
    status: string;
    recordOrigin: string | null;
  } | null,
) {
  const o = (mirror.normalizedData ?? {}) as FinanceOmieNormalizedTitulo;
  return {
    omie: {
      company: null,
      type: mirror.tituloTipo,
      counterparty: o.counterpartyName,
      document: o.documentNumber,
      installment: o.installment,
      originalAmount: o.originalAmount,
      dueDate: o.dueDate,
      settlementAmount: o.paidAmount,
      settlementDate: o.settlementDate,
      account: o.accountLabel,
      paymentMethod: o.paymentMethodLabel,
      category: o.categoryLabel,
      status: o.statusOmie,
      reconciliation: o.reconciliationConciliado,
      externalId: mirror.omieExternalId,
      matchLevel: mirror.matchLevel,
    },
    cup360: lanc
      ? {
          counterparty: lanc.contraparte,
          document: lanc.documentNumber ?? lanc.referencia,
          originalAmount: decimalToNumber(lanc.valor),
          dueDate: lanc.dueDate.toISOString().slice(0, 10),
          settlementDate: lanc.settledAt?.toISOString().slice(0, 10) ?? null,
          status: lanc.status,
          origin: lanc.recordOrigin,
        }
      : null,
    differences: diffFields(o, lanc),
  };
}

function diffFields(o: FinanceOmieNormalizedTitulo, lanc: { valor: unknown; dueDate: Date; status: string; settledAt: Date | null } | null): string[] {
  if (!lanc) return [];
  const out: string[] = [];
  const cup = decimalToNumber(lanc.valor);
  const omie = o.paidAmount ?? o.originalAmount ?? 0;
  if (Math.abs(cup - omie) > 0.05) out.push('valor');
  if (lanc.dueDate.toISOString().slice(0, 10) !== (o.dueDate ?? '')) out.push('vencimento');
  if (o.statusOmie?.toLowerCase().includes('pago') && lanc.status === 'pendente') out.push('status_pagamento');
  return out;
}
