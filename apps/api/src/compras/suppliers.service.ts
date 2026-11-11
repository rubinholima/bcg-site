import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { cadastroEmail, cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { ProcurementAuditService } from './procurement-audit.service';

const supplierInclude = {
  tenant: { select: { id: true, name: true, slug: true } },
  supplierCategory: { select: { id: true, name: true, slug: true } },
  _count: { select: { quotes: true, purchaseOrders: true } },
};

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: ProcurementAuditService,
  ) {}

  private tenantWhere(
    tenantId: string | undefined,
    allowedTenantIds: string[] | null,
  ): Prisma.SupplierWhereInput {
    if (tenantId) {
      return { tenantId };
    }
    if (allowedTenantIds === null) {
      return {};
    }
    if (!allowedTenantIds.length) {
      return { tenantId: { in: [] } };
    }
    return { tenantId: { in: allowedTenantIds } };
  }

  async findAll(
    tenantId: string | undefined,
    search: string | undefined,
    allowedTenantIds: string[] | null,
    filters?: {
      status?: string;
      categoryId?: string;
      country?: string;
    },
  ) {
    const where: Prisma.SupplierWhereInput = this.tenantWhere(tenantId, allowedTenantIds);
    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' as const } },
        { tradeName: { contains: search.trim(), mode: 'insensitive' as const } },
        { contactName: { contains: search.trim(), mode: 'insensitive' as const } },
        { email: { contains: search.trim(), mode: 'insensitive' as const } },
        { document: { contains: search.trim(), mode: 'insensitive' as const } },
        { taxId: { contains: search.trim(), mode: 'insensitive' as const } },
      ];
    }
    if (filters?.status?.trim()) where.status = filters.status.trim();
    if (filters?.categoryId?.trim()) where.supplierCategoryId = filters.categoryId.trim();
    if (filters?.country?.trim()) {
      where.country = { equals: filters.country.trim(), mode: 'insensitive' as const };
    }
    return this.prisma.supplier.findMany({
      where,
      orderBy: [{ tenant: { name: 'asc' } }, { name: 'asc' }],
      include: supplierInclude,
    });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        ...supplierInclude,
        documents: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!supplier) throw new NotFoundException('Fornecedor não encontrado');
    return supplier;
  }

  async getHistory(id: string) {
    const supplier = await this.findOne(id);
    const [quotes, orders, audit] = await Promise.all([
      this.prisma.purchaseQuote.findMany({
        where: { supplierId: id },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: {
          requisition: { select: { id: true, status: true, requestedByName: true } },
        },
      }),
      this.prisma.purchaseOrder.findMany({
        where: { supplierId: id },
        orderBy: { orderedAt: 'desc' },
        take: 30,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          orderedAt: true,
          requisitionId: true,
        },
      }),
      this.audit.listForEntity('supplier', id),
    ]);
    return {
      supplier: { id: supplier.id, name: supplier.name, tenantId: supplier.tenantId },
      quotes,
      purchaseOrders: orders,
      wins: quotes.filter((q) => q.isWinner).length,
      audit,
    };
  }

  private supplierDataFromDto(dto: CreateSupplierDto | UpdateSupplierDto) {
    return {
      ...(dto.name != null && { name: cadastroUpperRequired(dto.name) }),
      ...(dto.document !== undefined && { document: dto.document?.trim() || null }),
      ...(dto.personType !== undefined && { personType: dto.personType ?? null }),
      ...(dto.tradeName !== undefined && { tradeName: cadastroUpper(dto.tradeName) }),
      ...(dto.taxId !== undefined && { taxId: dto.taxId?.trim() || null }),
      ...(dto.contactName !== undefined && { contactName: cadastroUpper(dto.contactName) }),
      ...(dto.email !== undefined && { email: cadastroEmail(dto.email) }),
      ...(dto.phone !== undefined && { phone: cadastroUpper(dto.phone) }),
      ...(dto.whatsapp !== undefined && { whatsapp: cadastroUpper(dto.whatsapp) }),
      ...(dto.website !== undefined && { website: dto.website?.trim() || null }),
      ...(dto.address !== undefined && { address: dto.address?.trim() || null }),
      ...(dto.addressStructured !== undefined && { addressStructured: dto.addressStructured as object }),
      ...(dto.commercial !== undefined && { commercial: dto.commercial as object }),
      ...(dto.country !== undefined && { country: dto.country?.trim() || null }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.supplierCategoryId !== undefined && { supplierCategoryId: dto.supplierCategoryId || null }),
      ...(dto.notes !== undefined && { notes: cadastroUpper(dto.notes) }),
    };
  }

  async create(
    dto: CreateSupplierDto,
    actor?: { userId?: string; name?: string },
  ) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant "${dto.tenantId}" não encontrado`);
    const created = await this.prisma.supplier.create({
      data: {
        tenantId: dto.tenantId,
        name: cadastroUpperRequired(dto.name),
        status: dto.status ?? 'active',
        ...this.supplierDataFromDto({ ...dto, name: undefined }),
      },
      include: supplierInclude,
    });
    void this.audit.log({
      tenantId: created.tenantId,
      entityType: 'supplier',
      entityId: created.id,
      action: 'created',
      actorUserId: actor?.userId,
      actorName: actor?.name,
    });
    return created;
  }

  async update(
    id: string,
    dto: UpdateSupplierDto,
    actor?: { userId?: string; name?: string },
  ) {
    const prev = await this.findOne(id);
    const updated = await this.prisma.supplier.update({
      where: { id },
      data: this.supplierDataFromDto(dto),
      include: supplierInclude,
    });
    void this.audit.log({
      tenantId: updated.tenantId,
      entityType: 'supplier',
      entityId: id,
      action: dto.status && dto.status !== prev.status ? 'status_changed' : 'updated',
      actorUserId: actor?.userId,
      actorName: actor?.name,
      metadata: dto.status ? { status: dto.status, previous: prev.status } : undefined,
    });
    return updated;
  }

  async setStatus(id: string, status: string, actor?: { userId?: string; name?: string }) {
    if (!['active', 'inactive', 'blocked'].includes(status)) {
      throw new BadRequestException('Status inválido.');
    }
    return this.update(id, { status }, actor);
  }

  async remove(id: string, actor?: { userId?: string; name?: string }) {
    const supplier = await this.findOne(id);
    const refs =
      (supplier._count?.quotes ?? 0) + (supplier._count?.purchaseOrders ?? 0);
    if (refs > 0) {
      await this.setStatus(id, 'inactive', actor);
      return { ok: true, soft: true };
    }
    await this.prisma.supplier.delete({ where: { id } });
    void this.audit.log({
      tenantId: supplier.tenantId,
      entityType: 'supplier',
      entityId: id,
      action: 'deleted',
      actorUserId: actor?.userId,
      actorName: actor?.name,
    });
    return { ok: true, soft: false };
  }

  async addDocument(
    supplierId: string,
    input: {
      label: string;
      docType?: string;
      mediaKey?: string;
      fileUrl?: string;
      createdByUserId?: string;
    },
    actor?: { userId?: string; name?: string },
  ) {
    const supplier = await this.findOne(supplierId);
    if (!input.label?.trim()) throw new BadRequestException('Informe o rótulo do documento.');
    if (!input.mediaKey?.trim() && !input.fileUrl?.trim()) {
      throw new BadRequestException('Informe o arquivo (mídia ou URL).');
    }
    const doc = await this.prisma.supplierDocument.create({
      data: {
        supplierId,
        label: input.label.trim(),
        docType: input.docType?.trim() || null,
        mediaKey: input.mediaKey?.trim() || null,
        fileUrl: input.fileUrl?.trim() || null,
        createdByUserId: input.createdByUserId ?? null,
      },
    });
    void this.audit.log({
      tenantId: supplier.tenantId,
      entityType: 'supplier',
      entityId: supplierId,
      action: 'document_uploaded',
      actorUserId: actor?.userId,
      actorName: actor?.name,
      metadata: { documentId: doc.id, label: doc.label, docType: doc.docType },
    });
    return doc;
  }

  async removeDocument(
    supplierId: string,
    documentId: string,
    actor?: { userId?: string; name?: string },
  ) {
    const supplier = await this.findOne(supplierId);
    const doc = await this.prisma.supplierDocument.findFirst({
      where: { id: documentId, supplierId },
    });
    if (!doc) throw new NotFoundException('Documento não encontrado');
    await this.prisma.supplierDocument.delete({ where: { id: documentId } });
    void this.audit.log({
      tenantId: supplier.tenantId,
      entityType: 'supplier',
      entityId: supplierId,
      action: 'document_removed',
      actorUserId: actor?.userId,
      actorName: actor?.name,
      metadata: { documentId, label: doc.label },
    });
    return { ok: true };
  }
}
