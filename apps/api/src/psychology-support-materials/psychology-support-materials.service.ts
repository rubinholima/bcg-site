import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';

const CATEGORY_LABELS: Record<string, string> = {
  protocolo: 'Protocolo',
  material: 'Material',
  apresentacao: 'Apresentação',
  formulario: 'Formulário',
  outro: 'Outro',
};

export type PsychologySupportMaterialRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  categoryLabel: string | null;
  fileKey: string;
  fileUrl: string;
  fileName: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  tenantId: string | null;
  tenantName: string | null;
  uploadedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PsychologySupportMaterialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  private mapRow(
    row: {
      id: string;
      title: string;
      description: string | null;
      category: string | null;
      fileKey: string;
      fileUrl: string;
      fileName: string;
      mimeType: string | null;
      fileSizeBytes: number | null;
      tenantId: string | null;
      uploadedBy: string | null;
      createdAt: Date;
      updatedAt: Date;
      tenant?: { name: string } | null;
    },
  ): PsychologySupportMaterialRow {
    const cat = row.category?.trim() || null;
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      category: cat,
      categoryLabel: cat ? (CATEGORY_LABELS[cat] ?? cat) : null,
      fileKey: row.fileKey,
      fileUrl: row.fileUrl,
      fileName: row.fileName,
      mimeType: row.mimeType,
      fileSizeBytes: row.fileSizeBytes,
      tenantId: row.tenantId,
      tenantName: row.tenant?.name ?? null,
      uploadedBy: row.uploadedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async list(params: {
    tenantId?: string;
    category?: string;
    search?: string;
  }): Promise<PsychologySupportMaterialRow[]> {
    const search = params.search?.trim();
    const rows = await this.prisma.psychologySupportMaterial.findMany({
      where: {
        ...(params.tenantId ? { tenantId: params.tenantId } : {}),
        ...(params.category ? { category: params.category } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { fileName: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { tenant: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.mapRow(row));
  }

  async createFromUpload(input: {
    title: string;
    description?: string | null;
    category?: string | null;
    tenantId?: string | null;
    uploadedBy?: string | null;
    fileBuffer: Buffer;
    originalName: string;
    mimeType?: string;
    fileSizeBytes?: number;
  }): Promise<PsychologySupportMaterialRow> {
    const upload = await this.s3.uploadPsychologySupportMaterial(
      input.fileBuffer,
      input.originalName,
      input.mimeType,
    );

    const row = await this.prisma.psychologySupportMaterial.create({
      data: {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        category: input.category?.trim() || null,
        fileKey: upload.key,
        fileUrl: upload.url,
        fileName: input.originalName,
        mimeType: upload.mimeType,
        fileSizeBytes: input.fileSizeBytes ?? input.fileBuffer.length,
        tenantId: input.tenantId?.trim() || null,
        uploadedBy: input.uploadedBy?.trim() || null,
      },
      include: { tenant: { select: { name: true } } },
    });

    return this.mapRow(row);
  }

  async remove(id: string): Promise<{ ok: true }> {
    const row = await this.prisma.psychologySupportMaterial.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Material não encontrado.');
    }
    try {
      await this.s3.deleteObject(row.fileKey);
    } catch {
      // segue removendo registro mesmo se S3 falhar
    }
    await this.prisma.psychologySupportMaterial.delete({ where: { id } });
    return { ok: true };
  }
}
