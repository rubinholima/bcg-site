import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { HelloSignService } from '../hello-sign/hello-sign.service';

export const LEGAL_DOC_TYPES = [
  { value: 'contrato_trabalho', label: 'Contrato de trabalho' },
  { value: 'contrato_imagem', label: 'Contrato de imagem' },
  { value: 'formacao', label: 'Contrato de formação' },
  { value: 'rescisao', label: 'Termo de rescisão' },
  { value: 'transferencia', label: 'Termo de transferência' },
  { value: 'aditivo', label: 'Aditivo contratual' },
  { value: 'procuração', label: 'Procuração' },
  { value: 'nda', label: 'NDA / Confidencialidade' },
  { value: 'outro', label: 'Outro' },
] as const;

@Injectable()
export class LegalDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly helloSign: HelloSignService,
  ) {}

  async findAllByPlayer(playerId: string) {
    await this.ensurePlayerExists(playerId);
    return this.prisma.legalDocument.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, playerId: string) {
    const doc = await this.prisma.legalDocument.findFirst({
      where: { id, playerId },
    });
    if (!doc) throw new NotFoundException('Documento não encontrado');
    return doc;
  }

  async create(
    playerId: string,
    data: {
      type: string;
      name: string;
      fileKey: string;
      fileUrl?: string;
      signerEmail?: string;
      signerName?: string;
      validFrom?: string;
      validUntil?: string;
      notes?: string;
      pageCount?: number;
    },
  ) {
    await this.ensurePlayerExists(playerId);

    return this.prisma.legalDocument.create({
      data: {
        playerId,
        type: data.type,
        name: data.name,
        fileKey: data.fileKey,
        fileUrl: data.fileUrl ?? null,
        status: 'draft',
        signerEmail: data.signerEmail ?? null,
        signerName: data.signerName ?? null,
        pageCount: data.pageCount ?? null,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        notes: data.notes ?? null,
      },
    });
  }

  async sendForSignature(
    id: string,
    playerId: string,
    signerEmail: string,
    signerName?: string,
    message?: string,
    signatureField?: { page?: number; x?: number; y?: number; width?: number; height?: number },
  ) {
    const doc = await this.findOne(id, playerId);

    if (doc.status !== 'draft' && doc.status !== 'cancelled') {
      throw new BadRequestException(
        `Documento com status "${doc.status}" não pode ser enviado.`,
      );
    }

    if (!this.helloSign.isConfigured()) {
      throw new BadRequestException(
        'HelloSign não está configurado. Configure HELLOSIGN_API_KEY no .env',
      );
    }

    const fileBuffer = await this.s3.getObjectBuffer(doc.fileKey);
    const fileName = doc.name.endsWith('.pdf') ? doc.name : `${doc.name}.pdf`;

    // Página do campo de assinatura (padrão 1; HelloSign rejeita se exceder o PDF)
    const page = signatureField?.page != null
      ? Math.max(1, Math.min(999, Number(signatureField.page) || 1))
      : 1;
    const validatedSignatureField = { ...(signatureField ?? {}), page };

    let result;
    try {
      result = await this.helloSign.sendForSignature({
        fileBuffer,
        fileName,
        agreementName: doc.name,
        signerEmail: signerEmail.trim(),
        signerName: signerName?.trim(),
        message,
        signatureField: validatedSignatureField,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Page') && msg.includes('exceeds document length')) {
        throw new BadRequestException(
          'A página selecionada é maior que o número de páginas do PDF. Use a página 1 para documentos de uma única página.',
        );
      }
      if (msg.includes('not decipherable')) {
        throw new BadRequestException(
          'O PDF não pôde ser lido. Verifique se o arquivo não está protegido, corrompido ou em formato incompatível.',
        );
      }
      if (msg.includes('outside the vertical bounds') || msg.includes('outside the document')) {
        throw new BadRequestException(
          'Erro de posicionamento do campo de assinatura. Tente novamente — o sistema ajustou a posição.',
        );
      }
      throw err;
    }

    await this.prisma.legalDocument.update({
      where: { id },
      data: {
        status: 'pending_signature',
        adobeAgreementId: result.signatureRequestId,
        signerEmail: signerEmail.trim(),
        signerName: signerName?.trim() ?? null,
        metadata: result.signingUrl
          ? { signingUrl: result.signingUrl }
          : (doc.metadata as object) ?? {},
      },
    });

    return {
      agreementId: result.signatureRequestId,
      signingUrl: result.signingUrl,
      message: 'Documento enviado para assinatura. O signatário receberá um e-mail.',
    };
  }

  /**
   * Chamado pelo webhook ou por polling manual para atualizar status e baixar PDF assinado.
   */
  async syncFromAdobe(id: string, playerId: string) {
    const doc = await this.findOne(id, playerId);

    if (!doc.adobeAgreementId) {
      throw new BadRequestException('Documento não foi enviado ao HelloSign.');
    }

    const { status } = await this.helloSign.getSignatureRequestStatus(doc.adobeAgreementId);

    const statusMap: Record<string, string> = {
      awaiting_signature: 'pending_signature',
      signed: 'signed',
      declined: 'cancelled',
      expired: 'expired',
    };

    const ourStatus = statusMap[status] ?? 'pending_signature';

    let signedFileKey: string | null = null;
    let signedFileUrl: string | null = null;

    if (ourStatus === 'signed') {
      const signedPdf = await this.helloSign.getSignedDocument(doc.adobeAgreementId);
      const uploadResult = await this.s3.uploadLegalDocument(
        signedPdf,
        playerId,
        `signed_${doc.name}`,
      );
      signedFileKey = uploadResult.key;
      signedFileUrl = uploadResult.url;
    }

    return this.prisma.legalDocument.update({
      where: { id },
      data: {
        status: ourStatus,
        signedFileKey,
        signedFileUrl,
      },
    });
  }

  async delete(id: string, playerId: string) {
    const doc = await this.findOne(id, playerId);

    try {
      await this.s3.deleteObject(doc.fileKey);
      if (doc.signedFileKey) await this.s3.deleteObject(doc.signedFileKey);
    } catch {
      // ignora falha ao deletar do S3
    }

    await this.prisma.legalDocument.delete({
      where: { id },
    });
    return { ok: true };
  }

  private async ensurePlayerExists(playerId: string) {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
    });
    if (!player) throw new NotFoundException('Jogador não encontrado');
  }
}
