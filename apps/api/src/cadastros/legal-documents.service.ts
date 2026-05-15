import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { cadastroEmail, cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
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
  private readonly logger = new Logger(LegalDocumentsService.name);

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

  /** Lista todos os documentos legais do sistema (para a tela "Todos os contratos"). */
  async findAll(filters?: { tenantId?: string; type?: string; status?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.tenantId?.trim()) {
      where.player = { tenantId: filters.tenantId.trim() };
    }
    if (filters?.type?.trim()) {
      where.type = filters.type.trim();
    }
    if (filters?.status?.trim()) {
      where.status = filters.status.trim();
    }
    return this.prisma.legalDocument.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        player: {
          select: { id: true, name: true, tenant: { select: { name: true } } },
        },
      },
    });
  }

  async findOne(id: string, playerId: string, opts?: { includePlayer?: boolean }) {
    const doc = await this.prisma.legalDocument.findFirst({
      where: { id, playerId },
      include:
        opts?.includePlayer === true
          ? { player: { select: { name: true } } }
          : undefined,
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
        name: cadastroUpperRequired(data.name),
        fileKey: data.fileKey,
        fileUrl: data.fileUrl?.trim() || null,
        status: 'draft',
        signerEmail: cadastroEmail(data.signerEmail),
        signerName: cadastroUpper(data.signerName),
        pageCount: data.pageCount ?? null,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        notes: cadastroUpper(data.notes),
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
        signerEmail: cadastroEmail(signerEmail) ?? signerEmail.trim().toLowerCase(),
        signerName: cadastroUpper(signerName) ?? undefined,
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
        signerEmail: cadastroEmail(signerEmail) ?? signerEmail.trim().toLowerCase(),
        signerName: cadastroUpper(signerName) ?? null,
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

    let status: string;
    try {
      const result = await this.helloSign.getSignatureRequestStatus(doc.adobeAgreementId);
      status = result.status;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`HelloSign getStatus falhou: ${msg}`);
      throw new BadRequestException(
        `Não foi possível consultar o HelloSign. ${msg} Verifique HELLOSIGN_API_KEY e HELLOSIGN_TEST_MODE (use true se o documento foi enviado em sandbox).`,
      );
    }

    this.logger.log(`HelloSign status para ${doc.adobeAgreementId}: "${status}"`);

    const statusMap: Record<string, string> = {
      awaiting_signature: 'pending_signature',
      signed: 'signed',
      complete: 'signed',
      closed: 'signed',
      declined: 'cancelled',
      expired: 'expired',
    };

    const ourStatus = statusMap[status.toLowerCase?.() ?? ''] ?? statusMap[status] ?? 'pending_signature';

    let signedFileKey: string | null = null;
    let signedFileUrl: string | null = null;

    if (ourStatus === 'signed') {
      try {
        const signedPdf = await this.helloSign.getSignedDocument(doc.adobeAgreementId);
        const player = await this.prisma.player.findUnique({
          where: { id: playerId },
          select: { name: true },
        });
        const playerName = player?.name?.trim() ?? 'Atleta';
        const pdfWithLabel = await this.addSignedLabelToPdf(signedPdf, playerName);
        const safeName = `${playerName} - ${doc.name} - Assinado`.replace(
          /[^a-zA-Z0-9\u00C0-\u024F\s._-]/g,
          '_',
        );
        const uploadResult = await this.s3.uploadLegalDocument(
          pdfWithLabel,
          playerId,
          `${safeName}.pdf`,
        );
        signedFileKey = uploadResult.key;
        signedFileUrl = uploadResult.url;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`HelloSign getSignedDocument falhou: ${msg}`);
        throw new BadRequestException(
          `Contrato assinado no HelloSign, mas falha ao baixar o PDF: ${msg}. Tente novamente em alguns segundos.`,
        );
      }
    } else if (status !== 'awaiting_signature' && status !== 'signed' && status !== 'complete') {
      this.logger.warn(`Status HelloSign não mapeado: "${status}"`);
    }

    const updated = await this.prisma.legalDocument.update({
      where: { id },
      data: {
        status: ourStatus,
        signedFileKey,
        signedFileUrl,
      },
    });

    return { document: updated, helloSignStatus: status };
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

  /**
   * Adiciona no PDF a linha "Assinado - [Nome do atleta]" na última página.
   */
  private async addSignedLabelToPdf(pdfBuffer: Buffer, playerName: string): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();
    if (pages.length === 0) return pdfBuffer;
    const lastPage = pages[pages.length - 1];
    const { height } = lastPage.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const text = `Assinado - ${playerName}`;
    const fontSize = 10;
    lastPage.drawText(text, {
      x: 50,
      y: height - 30,
      size: fontSize,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    const bytes = await pdfDoc.save();
    return Buffer.from(bytes);
  }
}
