import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ModuleAccessGuard } from '../auth/module-access.guard';
import { RequireModule } from '../auth/require-module.decorator';
import { PDFDocument } from 'pdf-lib';
import { LegalDocumentsService } from './legal-documents.service';
import { S3Service } from '../s3/s3.service';

@Controller('players')
@UseGuards(JwtAuthGuard, ModuleAccessGuard)
@RequireModule('juridico')
export class LegalDocumentsController {
  constructor(
    private readonly service: LegalDocumentsService,
    private readonly s3: S3Service,
  ) {}

  @Get(':playerId/legal-documents')
  async list(@Param('playerId') playerId: string) {
    return this.service.findAllByPlayer(playerId);
  }

  @Post(':playerId/legal-documents')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async create(
    @Param('playerId') playerId: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype?: string } | undefined,
    @Body('type') type?: string,
    @Body('name') name?: string,
    @Body('signerEmail') signerEmail?: string,
    @Body('signerName') signerName?: string,
    @Body('validFrom') validFrom?: string,
    @Body('validUntil') validUntil?: string,
    @Body('notes') notes?: string,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Envie um arquivo PDF (campo "file").');
    }
    const isPdf =
      file.mimetype === 'application/pdf' ||
      (file.originalname?.toLowerCase().endsWith('.pdf') ?? false);
    if (!isPdf) {
      throw new BadRequestException('Apenas arquivos PDF são aceitos.');
    }
    if (!type?.trim() || !name?.trim()) {
      throw new BadRequestException('Campo "type" e "name" são obrigatórios.');
    }

    let pageCount: number | undefined;
    try {
      const pdfDoc = await PDFDocument.load(file.buffer, { ignoreEncryption: true });
      pageCount = pdfDoc.getPageCount();
    } catch {
      // fallback: unable to parse PDF pages
    }

    const result = await this.s3.uploadLegalDocument(
      file.buffer,
      playerId,
      file.originalname || 'documento.pdf',
    );

    return this.service.create(playerId, {
      type: type.trim(),
      name: name.trim(),
      fileKey: result.key,
      fileUrl: result.url,
      signerEmail: signerEmail?.trim(),
      signerName: signerName?.trim(),
      validFrom,
      validUntil,
      notes: notes?.trim(),
      pageCount,
    });
  }

  @Post(':playerId/legal-documents/:id/send-for-signature')
  async sendForSignature(
    @Param('playerId') playerId: string,
    @Param('id') id: string,
    @Body('signerEmail') signerEmail?: string,
    @Body('signerName') signerName?: string,
    @Body('message') message?: string,
    @Body('signaturePage') signaturePage?: number | string,
  ) {
    if (!signerEmail?.trim()) {
      throw new BadRequestException('Campo "signerEmail" é obrigatório.');
    }
    const pageNum =
      signaturePage != null
        ? Math.max(1, Math.min(999, parseInt(String(signaturePage), 10) || 1))
        : undefined;
    const signatureField = pageNum != null ? { page: pageNum } : undefined;
    return this.service.sendForSignature(id, playerId, signerEmail.trim(), signerName?.trim(), message?.trim(), signatureField);
  }

  @Post(':playerId/legal-documents/:id/sync')
  async sync(@Param('playerId') playerId: string, @Param('id') id: string) {
    return this.service.syncFromAdobe(id, playerId);
  }

  @Get(':playerId/legal-documents/:id/download')
  async download(
    @Param('playerId') playerId: string,
    @Param('id') id: string,
  ) {
    const doc = await this.service.findOne(id, playerId);
    const key = doc.signedFileKey ?? doc.fileKey;
    const buffer = await this.s3.getObjectBuffer(key);
    const filename = (doc.name.endsWith('.pdf') ? doc.name : `${doc.name}.pdf`)
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @Delete(':playerId/legal-documents/:id')
  async delete(@Param('playerId') playerId: string, @Param('id') id: string) {
    return this.service.delete(id, playerId);
  }
}
