import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeavePeriodDto } from './dto/create-leave-period.dto';
import { UpdateLeavePeriodDto } from './dto/update-leave-period.dto';
import { assertRhTenantAccess } from './rh-scope.util';

@Injectable()
export class LeavePeriodsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertEmploymentScope(employmentId: string, allowedTenantIds: string[] | null) {
    const employment = await this.prisma.employment.findUnique({
      where: { id: employmentId },
      select: { tenantId: true },
    });
    if (!employment) throw new NotFoundException('Vínculo não encontrado');
    assertRhTenantAccess(allowedTenantIds, employment.tenantId);
    return employment;
  }

  async findByEmployment(employmentId: string, allowedTenantIds: string[] | null = null) {
    await this.assertEmploymentScope(employmentId, allowedTenantIds);
    return this.prisma.leavePeriod.findMany({
      where: { employmentId },
      orderBy: { startDate: 'desc' },
      include: { employment: { select: { id: true, employeeId: true } } },
    });
  }

  async findOne(id: string, allowedTenantIds: string[] | null = null) {
    const lp = await this.prisma.leavePeriod.findUnique({
      where: { id },
      include: {
        employment: {
          select: {
            id: true,
            tenantId: true,
            employeeId: true,
            employee: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!lp) throw new NotFoundException('Período de afastamento/férias não encontrado');
    assertRhTenantAccess(allowedTenantIds, lp.employment.tenantId);
    return lp;
  }

  async create(dto: CreateLeavePeriodDto, allowedTenantIds: string[] | null = null) {
    await this.assertEmploymentScope(dto.employmentId, allowedTenantIds);
    return this.prisma.leavePeriod.create({
      data: {
        employmentId: dto.employmentId,
        type: dto.type,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        documentRef: dto.documentRef ?? null,
        catNumber: dto.catNumber ?? null,
        notes: dto.notes ?? null,
        status: dto.status ?? 'planned',
      },
      include: { employment: { select: { id: true, employeeId: true } } },
    });
  }

  async update(id: string, dto: UpdateLeavePeriodDto, allowedTenantIds: string[] | null = null) {
    await this.findOne(id, allowedTenantIds);
    const data: Record<string, unknown> = {};
    if (dto.type != null) data.type = dto.type;
    if (dto.startDate != null) data.startDate = new Date(dto.startDate);
    if (dto.endDate != null) data.endDate = new Date(dto.endDate);
    if (dto.documentRef !== undefined) data.documentRef = dto.documentRef ?? null;
    if (dto.catNumber !== undefined) data.catNumber = dto.catNumber ?? null;
    if (dto.notes !== undefined) data.notes = dto.notes ?? null;
    if (dto.status != null) data.status = dto.status;
    return this.prisma.leavePeriod.update({
      where: { id },
      data,
      include: { employment: { select: { id: true, employeeId: true } } },
    });
  }

  async remove(id: string, allowedTenantIds: string[] | null = null) {
    await this.findOne(id, allowedTenantIds);
    await this.prisma.leavePeriod.delete({ where: { id } });
  }
}
