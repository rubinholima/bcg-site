import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseRequisitionDto } from './dto/create-purchase-requisition.dto';
import { UpdatePurchaseRequisitionDto } from './dto/update-purchase-requisition.dto';

@Injectable()
export class PurchaseRequisitionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string, status?: string) {
    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;
    if (status?.trim()) where.status = status.trim();
    return this.prisma.purchaseRequisition.findMany({
      where,
      orderBy: [{ requestedAt: 'desc' }],
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async findOne(id: string) {
    const req = await this.prisma.purchaseRequisition.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    if (!req) throw new NotFoundException('Requisição de compra não encontrada');
    return req;
  }

  async create(dto: CreatePurchaseRequisitionDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant "${dto.tenantId}" não encontrado`);
    return this.prisma.purchaseRequisition.create({
      data: {
        tenantId: dto.tenantId,
        requestedByName: dto.requestedByName,
        justification: dto.justification ?? null,
        items: dto.items as object,
        totalEstimated: dto.totalEstimated ?? null,
        status: 'rascunho',
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async update(id: string, dto: UpdatePurchaseRequisitionDto) {
    await this.findOne(id);
    const data: Record<string, unknown> = {};
    if (dto.requestedByName != null) data.requestedByName = dto.requestedByName;
    if (dto.justification !== undefined) data.justification = dto.justification ?? null;
    if (dto.items != null) data.items = dto.items;
    if (dto.totalEstimated !== undefined) data.totalEstimated = dto.totalEstimated ?? null;
    if (dto.status != null) data.status = dto.status;
    return this.prisma.purchaseRequisition.update({
      where: { id },
      data,
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.purchaseRequisition.delete({ where: { id } });
  }
}
