import { Injectable, NotFoundException } from '@nestjs/common';
import { cadastroEmail, cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string, search?: string) {
    const where: Record<string, unknown> = {};
    if (tenantId) where.tenantId = tenantId;
    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' as const } },
        { document: { contains: search.trim(), mode: 'insensitive' as const } },
        { contactName: { contains: search.trim(), mode: 'insensitive' as const } },
        { email: { contains: search.trim(), mode: 'insensitive' as const } },
      ];
    }
    return this.prisma.customer.findMany({
      where,
      orderBy: [{ tenant: { name: 'asc' } }, { name: 'asc' }],
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.customer.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    if (!row) throw new NotFoundException('Cliente não encontrado');
    return row;
  }

  async create(dto: CreateCustomerDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException(`Empresa "${dto.tenantId}" não encontrada`);
    return this.prisma.customer.create({
      data: {
        tenantId: dto.tenantId,
        name: cadastroUpperRequired(dto.name),
        document: dto.document?.trim() || null,
        contactName: cadastroUpper(dto.contactName),
        email: cadastroEmail(dto.email),
        phone: cadastroUpper(dto.phone),
        notes: cadastroUpper(dto.notes),
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);
    return this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: cadastroUpperRequired(dto.name) }),
        ...(dto.document !== undefined && { document: dto.document?.trim() || null }),
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
    await this.prisma.customer.delete({ where: { id } });
  }
}
