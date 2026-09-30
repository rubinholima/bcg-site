import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { isProspectMinorFromBirthDate } from './tryout-age.util';
import {
  TRYOUT_BLOCKING_DOCUMENT_TYPES,
  type TryoutProspectDocumentType,
} from './tryout-workflow.constants';

@Injectable()
export class TryoutProspectDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  async listActive(prospectId: string) {
    return this.prisma.scoutingProspectDocument.findMany({
      where: { prospectId, deletedAt: null },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async upload(
    prospectId: string,
    tenantId: string,
    file: { buffer: Buffer; originalname: string; mimetype?: string },
    documentType: TryoutProspectDocumentType,
    userId?: string,
  ) {
    const lower = file.originalname?.toLowerCase() ?? '';
    const allowed =
      lower.endsWith('.pdf') ||
      lower.endsWith('.png') ||
      lower.endsWith('.jpg') ||
      lower.endsWith('.jpeg') ||
      lower.endsWith('.webp') ||
      file.mimetype === 'application/pdf' ||
      file.mimetype?.startsWith('image/');
    if (!allowed) {
      throw new BadRequestException('Envie PDF ou imagem (PNG, JPG, WEBP).');
    }
    if (file.buffer.length > 15 * 1024 * 1024) {
      throw new BadRequestException('Arquivo acima de 15 MB.');
    }

    const uploaded = await this.s3.uploadTryoutProspectDocument(
      file.buffer,
      prospectId,
      file.originalname || 'documento.pdf',
      file.mimetype,
    );

    return this.prisma.scoutingProspectDocument.create({
      data: {
        tenantId,
        prospectId,
        documentType,
        confidentialityCategory: 'operacional',
        storageKey: uploaded.key,
        originalFilename: file.originalname || 'documento',
        mimeType: file.mimetype?.trim() || 'application/pdf',
        uploadedByUserId: userId ?? null,
      },
    });
  }

  async softDelete(documentId: string, prospectId: string, userId?: string) {
    const row = await this.prisma.scoutingProspectDocument.findFirst({
      where: { id: documentId, prospectId, deletedAt: null },
    });
    if (!row) throw new NotFoundException('Documento não encontrado.');
    return this.prisma.scoutingProspectDocument.update({
      where: { id: documentId },
      data: { deletedAt: new Date(), deletedByUserId: userId ?? null },
    });
  }

  async assertBlockingDocumentsSatisfied(prospectId: string, birthDate?: string | null) {
    return this.getBlockingStatus(prospectId, birthDate);
  }

  evaluateBlockingFromTypes(documentTypes: string[], birthDate?: string | null) {
    const types = new Set(documentTypes);
    const missing: string[] = [];
    if (!types.has('identidade')) {
      missing.push('identidade');
    }
    if (isProspectMinorFromBirthDate(birthDate) && !types.has('autorizacao_responsavel')) {
      missing.push('autorizacao_responsavel');
    }
    return { satisfied: missing.length === 0, missing };
  }

  async getBlockingStatus(prospectId: string, birthDate?: string | null) {
    const docs = await this.prisma.scoutingProspectDocument.findMany({
      where: { prospectId, deletedAt: null },
      select: { documentType: true },
    });
    return this.evaluateBlockingFromTypes(
      docs.map((d) => d.documentType),
      birthDate,
    );
  }
}

export { TRYOUT_BLOCKING_DOCUMENT_TYPES };
