import { Injectable, NotFoundException } from '@nestjs/common';
import { cadastroEmail, cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string, search?: string) {
    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;
    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' as const } },
        { contactName: { contains: search.trim(), mode: 'insensitive' as const } },
        { email: { contains: search.trim(), mode: 'insensitive' as const } },
      ];
    }
    return this.prisma.supplier.findMany({
      where,
      orderBy: [{ tenant: { name: 'asc' } }, { name: 'asc' }],
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    if (!supplier) throw new NotFoundException('Fornecedor não encontrado');
    return supplier;
  }

  async create(dto: CreateSupplierDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException(`Tenant "${dto.tenantId}" não encontrado`);
    return this.prisma.supplier.create({
      data: {
        tenantId: dto.tenantId,
        name: cadastroUpperRequired(dto.name),
        contactName: cadastroUpper(dto.contactName),
        email: cadastroEmail(dto.email),
        phone: cadastroUpper(dto.phone),
        notes: cadastroUpper(dto.notes),
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id);
    return this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.contactName !== undefined && { contactName: cadastroUpper(dto.contactName) }),
        ...(dto.email !== undefined && { email: cadastroEmail(dto.email) }),
        ...(dto.phone !== undefined && { phone: cadastroUpper(dto.phone) }),
        ...(dto.notes !== undefined && { notes: cadastroUpper(dto.notes) }),
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.supplier.delete({ where: { id } });
  }
}
