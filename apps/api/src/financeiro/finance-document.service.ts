import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { FinanceAuditService } from './finance-audit.service';

@Injectable()
export class FinanceDocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly audit: FinanceAuditService,
  ) {}

  async registerDocument(
    tenantId: string,
    lancamentoId: string,
    input: {
      docType: string;
      fileKey: string;
      fileName: string;
      mimeType?: string;
      notes?: string;
    },
    actorUserId?: string | null,
  ) {
    const lanc = await this.prisma.financeiroLancamento.findFirst({
      where: { id: lancamentoId, tenantId },
    });
    if (!lanc) throw new NotFoundException('Lançamento não encontrado.');

    const doc = await this.prisma.financeLancamentoDocument.create({
      data: {
        tenantId,
        financeiroLancamentoId: lancamentoId,
        docType: input.docType.trim().toUpperCase(),
        fileKey: input.fileKey.trim(),
        fileName: input.fileName.trim(),
        mimeType: input.mimeType?.trim() || null,
        notes: input.notes?.trim() || null,
        uploadedByUserId: actorUserId ?? null,
      },
    });

    await this.audit.log({
      tenantId,
      financeiroLancamentoId: lancamentoId,
      eventType: 'document_attached',
      actorUserId: actorUserId ?? null,
      metadata: { documentId: doc.id, docType: doc.docType },
    });

    return { ...doc, downloadUrl: null };
  }

  async replaceBoleto(
    tenantId: string,
    oldDocumentId: string,
    newDoc: {
      fileKey: string;
      fileName: string;
      mimeType?: string;
    },
    actorUserId?: string | null,
  ) {
    const old = await this.prisma.financeLancamentoDocument.findFirst({
      where: { id: oldDocumentId, tenantId },
    });
    if (!old) throw new NotFoundException('Documento não encontrado.');

    const created = await this.prisma.financeLancamentoDocument.create({
      data: {
        tenantId,
        financeiroLancamentoId: old.financeiroLancamentoId,
        docType: 'BOLETO',
        fileKey: newDoc.fileKey,
        fileName: newDoc.fileName,
        mimeType: newDoc.mimeType ?? null,
        uploadedByUserId: actorUserId ?? null,
      },
    });

    await this.prisma.financeLancamentoDocument.update({
      where: { id: old.id },
      data: { status: 'replaced', replacedByDocumentId: created.id },
    });

    await this.audit.log({
      tenantId,
      financeiroLancamentoId: old.financeiroLancamentoId,
      eventType: 'document_replaced',
      actorUserId: actorUserId ?? null,
      metadata: { oldDocumentId: old.id, newDocumentId: created.id },
    });

    return created;
  }

  async list(tenantId: string, lancamentoId: string) {
    return this.prisma.financeLancamentoDocument.findMany({
      where: { tenantId, financeiroLancamentoId: lancamentoId },
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        docType: true,
        fileName: true,
        mimeType: true,
        status: true,
        replacedByDocumentId: true,
        uploadedAt: true,
        uploadedByUserId: true,
      },
    });
  }

  async downloadStream(tenantId: string, documentId: string) {
    const doc = await this.prisma.financeLancamentoDocument.findFirst({
      where: { id: documentId, tenantId },
    });
    if (!doc?.fileKey) throw new NotFoundException('Documento não encontrado.');
    const { body, contentType } = await this.s3.getObject(doc.fileKey);
    return { stream: body, fileName: doc.fileName, mimeType: doc.mimeType ?? contentType };
  }

  async attachSettlementProof(
    tenantId: string,
    settlementId: string,
    input: { fileKey: string; fileName: string; mimeType?: string },
    actorUserId?: string | null,
  ) {
    const settlement = await this.prisma.financeSettlement.findFirst({
      where: { id: settlementId, tenantId },
    });
    if (!settlement) throw new NotFoundException('Baixa não encontrada.');

    const proof = await this.prisma.financeSettlementProof.create({
      data: {
        tenantId,
        settlementId,
        fileKey: input.fileKey.trim(),
        fileName: input.fileName.trim(),
        mimeType: input.mimeType?.trim() || null,
        uploadedByUserId: actorUserId ?? null,
      },
    });

    await this.audit.log({
      tenantId,
      financeiroLancamentoId: settlement.financeiroLancamentoId,
      eventType: 'proof_attached',
      actorUserId: actorUserId ?? null,
      metadata: { settlementId, proofId: proof.id },
    });

    return proof;
  }
}
