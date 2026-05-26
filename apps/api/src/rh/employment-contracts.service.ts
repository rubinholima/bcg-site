import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { cadastroEmail, cadastroUpper } from '../common/cadastro-text';
import { ContractTemplatesService } from '../cadastros/contract-templates.service';
import { HelloSignService } from '../hello-sign/hello-sign.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class EmploymentContractsService {
  private readonly logger = new Logger(EmploymentContractsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly templates: ContractTemplatesService,
    private readonly helloSign: HelloSignService,
  ) {}

  async findByEmployment(employmentId: string) {
    await this.ensureEmployment(employmentId);
    return this.prisma.employmentContract.findMany({
      where: { employmentId },
      orderBy: { createdAt: 'desc' },
      include: {
        template: { select: { id: true, name: true, type: true, signaturePage: true } },
      },
    });
  }

  /** Lista global para Jurídico (filtro por clube, status ou tipo de modelo). */
  async findAll(filters?: { tenantId?: string; status?: string; type?: string; employeeId?: string }) {
    const where: {
      tenantId?: string;
      status?: string;
      template?: { type: string };
      employment?: { employeeId: string };
    } = {};
    if (filters?.tenantId?.trim()) where.tenantId = filters.tenantId.trim();
    if (filters?.status?.trim()) where.status = filters.status.trim();
    if (filters?.type?.trim()) where.template = { type: filters.type.trim() };
    if (filters?.employeeId?.trim()) {
      where.employment = { employeeId: filters.employeeId.trim() };
    }

    return this.prisma.employmentContract.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        template: { select: { id: true, name: true, type: true, signaturePage: true } },
        tenant: { select: { id: true, name: true } },
        employment: {
          select: {
            id: true,
            contractType: true,
            employee: { select: { id: true, name: true, email: true } },
            jobRole: { select: { name: true } },
          },
        },
      },
    });
  }

  async findOne(employmentId: string, id: string) {
    const row = await this.prisma.employmentContract.findFirst({
      where: { id, employmentId },
      include: {
        template: true,
        employment: {
          include: {
            employee: { select: { id: true, name: true, email: true } },
            tenant: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!row) throw new NotFoundException('Contrato não encontrado');
    return row;
  }

  async generate(employmentId: string, templateId: string, name?: string) {
    const employment = await this.ensureEmployment(employmentId);
    const template = await this.templates.findOne(templateId);

    const filled = await this.templates.generateFilledPdf(templateId, employmentId);
    const displayName =
      name?.trim() ||
      `${template.name} — ${employment.employee.name}`.slice(0, 120);

    const upload = await this.s3.uploadEmploymentContract(
      filled,
      employmentId,
      `${displayName}.pdf`,
    );

    return this.prisma.employmentContract.create({
      data: {
        tenantId: employment.tenantId,
        employmentId,
        templateId,
        name: displayName.toUpperCase(),
        fileKey: upload.key,
        fileUrl: upload.url,
        status: 'draft',
        signerEmail: employment.employee.email?.trim().toLowerCase() || null,
        signerName: employment.employee.name?.trim().toUpperCase() || null,
      },
      include: {
        template: { select: { id: true, name: true, type: true, signaturePage: true } },
      },
    });
  }

  async sendForSignature(
    employmentId: string,
    id: string,
    signerEmail: string,
    signerName?: string,
    signaturePage?: number,
  ) {
    const doc = await this.findOne(employmentId, id);

    if (doc.status !== 'draft' && doc.status !== 'cancelled') {
      throw new BadRequestException(`Contrato com status "${doc.status}" não pode ser enviado.`);
    }

    if (!this.helloSign.isConfigured()) {
      throw new BadRequestException(
        'HelloSign não configurado. Defina HELLOSIGN_API_KEY no .env',
      );
    }

    const fileBuffer = await this.s3.getObjectBuffer(doc.fileKey);
    const fileName = doc.name.endsWith('.pdf') ? doc.name : `${doc.name}.pdf`;
    const page = signaturePage ?? doc.template?.signaturePage ?? 1;

    let result;
    try {
      result = await this.helloSign.sendForSignature({
        fileBuffer,
        fileName,
        agreementName: doc.name,
        signerEmail: cadastroEmail(signerEmail) ?? signerEmail.trim().toLowerCase(),
        signerName: cadastroUpper(signerName) ?? undefined,
        signatureField: { page },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Page') && msg.includes('exceeds document length')) {
        throw new BadRequestException(
          'Página de assinatura maior que o total de páginas do PDF.',
        );
      }
      throw err;
    }

    await this.prisma.employmentContract.update({
      where: { id },
      data: {
        status: 'pending_signature',
        helloSignRequestId: result.signatureRequestId,
        signerEmail: cadastroEmail(signerEmail) ?? signerEmail.trim().toLowerCase(),
        signerName: cadastroUpper(signerName) ?? null,
        metadata: result.signingUrl
          ? { signingUrl: result.signingUrl }
          : ((doc.metadata as object) ?? {}),
      },
    });

    return {
      requestId: result.signatureRequestId,
      signingUrl: result.signingUrl,
      message: 'Contrato enviado para assinatura.',
    };
  }

  async syncFromHelloSign(employmentId: string, id: string) {
    const doc = await this.findOne(employmentId, id);

    if (!doc.helloSignRequestId) {
      throw new BadRequestException('Contrato não foi enviado ao HelloSign.');
    }

    let status: string;
    try {
      const result = await this.helloSign.getSignatureRequestStatus(doc.helloSignRequestId);
      status = result.status;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new BadRequestException(`Não foi possível consultar HelloSign: ${msg}`);
    }

    const statusMap: Record<string, string> = {
      awaiting_signature: 'pending_signature',
      signed: 'signed',
      complete: 'signed',
      closed: 'signed',
      declined: 'cancelled',
      expired: 'expired',
    };
    const ourStatus = statusMap[status.toLowerCase?.() ?? ''] ?? 'pending_signature';

    let signedFileKey = doc.signedFileKey;
    let signedFileUrl = doc.signedFileUrl;

    if (ourStatus === 'signed' && !doc.signedFileKey) {
      try {
        const signedBuffer = await this.helloSign.getSignedDocument(doc.helloSignRequestId);
        const upload = await this.s3.uploadEmploymentContract(
          signedBuffer,
          employmentId,
          `${doc.name} - Assinado.pdf`,
        );
        signedFileKey = upload.key;
        signedFileUrl = upload.url;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Falha ao baixar PDF assinado: ${msg}`);
      }
    }

    return this.prisma.employmentContract.update({
      where: { id },
      data: {
        status: ourStatus,
        signedFileKey,
        signedFileUrl,
      },
      include: {
        template: { select: { id: true, name: true, type: true } },
      },
    });
  }

  async downloadBuffer(employmentId: string, id: string, signed = false) {
    const doc = await this.findOne(employmentId, id);
    const key = signed && doc.signedFileKey ? doc.signedFileKey : doc.fileKey;
    const buffer = await this.s3.getObjectBuffer(key);
    const filename =
      signed && doc.signedFileKey
        ? `${doc.name} - Assinado.pdf`
        : doc.name.endsWith('.pdf')
          ? doc.name
          : `${doc.name}.pdf`;
    return { buffer, filename: filename.replace(/[^a-zA-Z0-9\u00C0-\u024F\s._-]/g, '_') };
  }

  async remove(employmentId: string, id: string) {
    const doc = await this.findOne(employmentId, id);
    if (doc.status === 'pending_signature') {
      throw new BadRequestException('Cancele ou aguarde a assinatura antes de excluir.');
    }
    try {
      await this.s3.deleteObject(doc.fileKey);
      if (doc.signedFileKey) await this.s3.deleteObject(doc.signedFileKey);
    } catch {
      // ignora
    }
    await this.prisma.employmentContract.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureEmployment(employmentId: string) {
    const employment = await this.prisma.employment.findUnique({
      where: { id: employmentId },
      include: {
        employee: true,
        tenant: true,
        jobRole: true,
        department: true,
      },
    });
    if (!employment) throw new NotFoundException('Vínculo não encontrado');
    return employment;
  }
}
