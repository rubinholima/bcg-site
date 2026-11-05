import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryDepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, activeOnly = true) {
    const tid = tenantId?.trim();
    if (!tid) throw new BadRequestException('Informe o clube/empresa');
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tid }, select: { id: true } });
    if (!tenant) throw new NotFoundException('Clube não encontrado');

    return this.prisma.inventoryDepartment.findMany({
      where: {
        tenantId: tid,
        ...(activeOnly ? { active: true } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async create(tenantId: string, name: string) {
    const tid = tenantId?.trim();
    const label = name?.trim();
    if (!tid) throw new BadRequestException('Informe o clube/empresa');
    if (!label) throw new BadRequestException('Informe o nome do departamento');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tid }, select: { id: true } });
    if (!tenant) throw new NotFoundException('Clube não encontrado');

    const existing = await this.prisma.inventoryDepartment.findFirst({
      where: { tenantId: tid, name: { equals: label, mode: 'insensitive' } },
    });
    if (existing) {
      if (!existing.active) {
        return this.prisma.inventoryDepartment.update({
          where: { id: existing.id },
          data: { active: true, name: label },
        });
      }
      throw new BadRequestException('Já existe um departamento com este nome.');
    }

    const maxSort = await this.prisma.inventoryDepartment.aggregate({
      where: { tenantId: tid },
      _max: { sortOrder: true },
    });

    return this.prisma.inventoryDepartment.create({
      data: {
        tenantId: tid,
        name: label,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      },
    });
  }

  async deactivate(id: string, tenantId: string) {
    const row = await this.prisma.inventoryDepartment.findFirst({
      where: { id, tenantId },
    });
    if (!row) throw new NotFoundException('Departamento não encontrado');
    return this.prisma.inventoryDepartment.update({
      where: { id },
      data: { active: false },
    });
  }
}
