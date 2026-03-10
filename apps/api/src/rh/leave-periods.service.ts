import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLeavePeriodDto } from './dto/create-leave-period.dto';
import { UpdateLeavePeriodDto } from './dto/update-leave-period.dto';

@Injectable()
export class LeavePeriodsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmployment(employmentId: string) {
    const employment = await this.prisma.employment.findUnique({ where: { id: employmentId } });
    if (!employment) throw new NotFoundException('Vínculo não encontrado');
    return this.prisma.leavePeriod.findMany({
      where: { employmentId },
      orderBy: { startDate: 'desc' },
      include: { employment: { select: { id: true, employeeId: true } } },
    });
  }

  async findOne(id: string) {
    const lp = await this.prisma.leavePeriod.findUnique({
      where: { id },
      include: { employment: { include: { employee: { select: { id: true, name: true } } } } },
    });
    if (!lp) throw new NotFoundException('Período de afastamento/férias não encontrado');
    return lp;
  }

  async create(dto: CreateLeavePeriodDto) {
    const employment = await this.prisma.employment.findUnique({ where: { id: dto.employmentId } });
    if (!employment) throw new NotFoundException('Vínculo não encontrado');
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

  async update(id: string, dto: UpdateLeavePeriodDto) {
    await this.findOne(id);
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

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.leavePeriod.delete({ where: { id } });
  }
}
