import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

@Injectable()
export class PurchaseOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string, supplierId?: string, status?: string) {
    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;
    if (supplierId) where.supplierId = supplierId;
    if (status?.trim()) where.status = status.trim();
    return this.prisma.purchaseOrder.findMany({
      where,
      orderBy: [{ orderedAt: 'desc' }],
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        supplier: { select: { id: true, name: true, contactName: true, email: true, phone: true } },
        requisition: { select: { id: true, requestedByName: true, status: true } },
      },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        supplier: true,
        requisition: true,
      },
    });
    if (!order) throw new NotFoundException('Ordem de compra não encontrada');
    return order;
  }

  async create(dto: CreatePurchaseOrderDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant "${dto.tenantId}" não encontrado`);
    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
    if (!supplier) throw new NotFoundException('Fornecedor não encontrado');
    if (dto.requisitionId) {
      const req = await this.prisma.purchaseRequisition.findUnique({ where: { id: dto.requisitionId } });
      if (!req) throw new NotFoundException('Requisição de compra não encontrada');
    }
    return this.prisma.purchaseOrder.create({
      data: {
        tenantId: dto.tenantId,
        requisitionId: dto.requisitionId ?? null,
        supplierId: dto.supplierId,
        orderNumber: dto.orderNumber ?? null,
        items: dto.items as object,
        totalAmount: dto.totalAmount ?? null,
        expectedDelivery: dto.expectedDelivery ? new Date(dto.expectedDelivery) : null,
        status: 'draft',
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        supplier: { select: { id: true, name: true, contactName: true, email: true, phone: true } },
        requisition: { select: { id: true, requestedByName: true, status: true } },
      },
    });
  }

  async update(id: string, dto: UpdatePurchaseOrderDto) {
    await this.findOne(id);
    const data: Record<string, unknown> = {};
    if (dto.supplierId != null) data.supplierId = dto.supplierId;
    if (dto.orderNumber !== undefined) data.orderNumber = dto.orderNumber ?? null;
    if (dto.items != null) data.items = dto.items;
    if (dto.totalAmount !== undefined) data.totalAmount = dto.totalAmount ?? null;
    if (dto.expectedDelivery !== undefined) data.expectedDelivery = dto.expectedDelivery ? new Date(dto.expectedDelivery) : null;
    if (dto.status != null) data.status = dto.status;
    return this.prisma.purchaseOrder.update({
      where: { id },
      data,
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        supplier: { select: { id: true, name: true, contactName: true, email: true, phone: true } },
        requisition: { select: { id: true, requestedByName: true, status: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.purchaseOrder.delete({ where: { id } });
  }
}
