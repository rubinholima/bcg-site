import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
import {
  buildDefaultFieldMapping,
  CONTRACT_DATA_FIELD_CATALOG,
  buildEmploymentContractData,
  resolvePdfFieldValues,
  employmentToContractContext,
} from '../common/contract-data.util';
import {
  fillPdfFormFields,
  getPdfPageCount,
  listPdfFormFieldNames,
} from '../common/contract-pdf.util';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';

export const CONTRACT_TEMPLATE_TYPES = [
  { value: 'CLT', label: 'CLT — funcionário' },
  { value: 'contrato_trabalho', label: 'Contrato de trabalho (CLT genérico)' },
  { value: 'PJ', label: 'PJ — prestador de serviço' },
  { value: 'estagio', label: 'Estágio' },
  { value: 'temporario', label: 'Temporário' },
  { value: 'atleta', label: 'Contrato de atleta' },
  { value: 'formacao', label: 'Contrato de formação' },
  { value: 'contrato_imagem', label: 'Contrato de imagem / direito de arena' },
  { value: 'dirigente', label: 'Dirigente / gestão' },
  { value: 'aditivo', label: 'Aditivo contratual' },
  { value: 'rescisao', label: 'Termo de rescisão' },
  { value: 'transferencia', label: 'Termo de transferência' },
  { value: 'procuracao', label: 'Procuração' },
  { value: 'nda', label: 'NDA / confidencialidade' },
  { value: 'outro', label: 'Outro (qualquer vínculo)' },
] as const;

@Injectable()
export class ContractTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  getFieldCatalog() {
    return CONTRACT_DATA_FIELD_CATALOG;
  }

  async findAll(filters?: { tenantId?: string; type?: string; activeOnly?: boolean }) {
    const where: Prisma.ContractTemplateWhereInput = {};
    if (filters?.type?.trim()) where.type = filters.type.trim();
    if (filters?.activeOnly !== false) where.active = true;

    if (filters?.tenantId?.trim()) {
      where.OR = [{ tenantId: filters.tenantId.trim() }, { tenantId: null }];
    }

    return this.prisma.contractTemplate.findMany({
      where,
      orderBy: [{ name: 'asc' }],
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        _count: { select: { contracts: true } },
      },
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.contractTemplate.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!row) throw new NotFoundException('Modelo de contrato não encontrado');
    return row;
  }

  async createFromUpload(data: {
    tenantId?: string | null;
    name: string;
    type: string;
    fileBuffer: Buffer;
    originalName: string;
    notes?: string;
    signaturePage?: number;
  }) {
    const pdfFieldNames = await listPdfFormFieldNames(data.fileBuffer);
    const pageCount = await getPdfPageCount(data.fileBuffer);
    const scope = data.tenantId?.trim() || 'global';
    const upload = await this.s3.uploadContractTemplate(
      data.fileBuffer,
      scope,
      data.originalName,
    );

    const fieldMapping = buildDefaultFieldMapping(pdfFieldNames);

    return this.prisma.contractTemplate.create({
      data: {
        tenantId: data.tenantId?.trim() || null,
        name: cadastroUpperRequired(data.name),
        type: cadastroUpperRequired(data.type),
        fileKey: upload.key,
        fileUrl: upload.url,
        pdfFieldNames: pdfFieldNames as unknown as Prisma.InputJsonValue,
        fieldMapping: fieldMapping as unknown as Prisma.InputJsonValue,
        signaturePage: data.signaturePage ?? 1,
        pageCount: pageCount ?? null,
        notes: cadastroUpper(data.notes),
        active: true,
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      type?: string;
      fieldMapping?: Record<string, string>;
      signaturePage?: number;
      active?: boolean;
      notes?: string | null;
    },
  ) {
    await this.findOne(id);
    return this.prisma.contractTemplate.update({
      where: { id },
      data: {
        ...(data.name != null ? { name: cadastroUpperRequired(data.name) } : {}),
        ...(data.type != null ? { type: cadastroUpperRequired(data.type) } : {}),
        ...(data.fieldMapping != null
          ? { fieldMapping: data.fieldMapping as Prisma.InputJsonValue }
          : {}),
        ...(data.signaturePage != null ? { signaturePage: data.signaturePage } : {}),
        ...(data.active != null ? { active: data.active } : {}),
        ...(data.notes !== undefined ? { notes: cadastroUpper(data.notes) } : {}),
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async rescanFields(id: string) {
    const row = await this.findOne(id);
    const buffer = await this.s3.getObjectBuffer(row.fileKey);
    const pdfFieldNames = await listPdfFormFieldNames(buffer);
    const existing =
      row.fieldMapping && typeof row.fieldMapping === 'object' && !Array.isArray(row.fieldMapping)
        ? (row.fieldMapping as Record<string, string>)
        : {};
    const merged = { ...buildDefaultFieldMapping(pdfFieldNames), ...existing };

    return this.prisma.contractTemplate.update({
      where: { id },
      data: {
        pdfFieldNames: pdfFieldNames as unknown as Prisma.InputJsonValue,
        fieldMapping: merged as unknown as Prisma.InputJsonValue,
        pageCount: (await getPdfPageCount(buffer)) ?? row.pageCount,
      },
    });
  }

  async previewFill(id: string, employmentId: string) {
    const template = await this.findOne(id);
    const employment = await this.prisma.employment.findUnique({
      where: { id: employmentId },
      include: {
        tenant: true,
        employee: true,
        jobRole: true,
        department: true,
      },
    });
    if (!employment) throw new NotFoundException('Vínculo não encontrado');

    const mapping =
      template.fieldMapping && typeof template.fieldMapping === 'object'
        ? (template.fieldMapping as Record<string, string>)
        : {};

    const data = buildEmploymentContractData(employmentToContractContext(employment));
    const values = resolvePdfFieldValues(mapping, data as Record<string, string>);

    return {
      templateId: template.id,
      employmentId,
      mappedFields: values,
      dataPreview: data,
    };
  }

  async remove(id: string) {
    const row = await this.findOne(id);
    const inUse = await this.prisma.employmentContract.count({
      where: { templateId: id },
    });
    if (inUse > 0) {
      throw new BadRequestException(
        'Modelo em uso em contratos gerados. Desative em vez de excluir.',
      );
    }
    try {
      await this.s3.deleteObject(row.fileKey);
    } catch {
      // ignora
    }
    await this.prisma.contractTemplate.delete({ where: { id } });
    return { ok: true };
  }

  /** Gera PDF preenchido a partir do template + vínculo (usado pelo RH). */
  async generateFilledPdf(templateId: string, employmentId: string): Promise<Buffer> {
    const template = await this.findOne(templateId);
    const employment = await this.prisma.employment.findUnique({
      where: { id: employmentId },
      include: {
        tenant: true,
        employee: true,
        jobRole: true,
        department: true,
      },
    });
    if (!employment) throw new NotFoundException('Vínculo não encontrado');

    if (template.tenantId && template.tenantId !== employment.tenantId) {
      throw new BadRequestException('Modelo não disponível para esta empresa/clube.');
    }

    const templateBuffer = await this.s3.getObjectBuffer(template.fileKey);
    const mapping =
      template.fieldMapping && typeof template.fieldMapping === 'object'
        ? (template.fieldMapping as Record<string, string>)
        : {};

    const data = buildEmploymentContractData(employmentToContractContext(employment));
    const values = resolvePdfFieldValues(mapping, data as Record<string, string>);

    return fillPdfFormFields(templateBuffer, values);
  }
}
