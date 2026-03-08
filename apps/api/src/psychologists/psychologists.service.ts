import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PsychologistsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId?: string) {
    const where: { tenantId?: string | null } = {};
    if (tenantId !== undefined) {
      where.tenantId = tenantId || null;
    }
    return this.prisma.psychologist.findMany({
      where,
      include: { tenant: { select: { id: true, name: true, slug: true } } },
      orderBy: [{ name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.psychologist.findUnique({
      where: { id },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
    if (!row) throw new NotFoundException('Psicólogo não encontrado');
    return row;
  }

  async create(data: {
    name: string;
    email?: string;
    phone?: string;
    crpOrEquivalent?: string;
    bio?: string;
    photoUrl?: string;
    tenantId?: string;
    calendarBlocked?: boolean;
    attendanceLog?: object | unknown;
    performanceSheet?: object | unknown;
  }) {
    return this.prisma.psychologist.create({
      data: {
        name: data.name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        crpOrEquivalent: data.crpOrEquivalent ?? null,
        bio: data.bio ?? null,
        photoUrl: data.photoUrl ?? null,
        tenantId: data.tenantId ?? null,
        calendarBlocked: data.calendarBlocked ?? false,
        attendanceLog: data.attendanceLog === undefined || data.attendanceLog === null ? Prisma.JsonNull : (data.attendanceLog as object),
        performanceSheet: data.performanceSheet === undefined || data.performanceSheet === null ? Prisma.JsonNull : (data.performanceSheet as object),
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async update(
    id: string,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      crpOrEquivalent?: string;
      bio?: string;
      photoUrl?: string;
      tenantId?: string;
      calendarBlocked?: boolean;
      attendanceLog?: object | unknown;
      performanceSheet?: object | unknown;
    },
  ) {
    await this.findOne(id);
    return this.prisma.psychologist.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email ?? null }),
        ...(data.phone !== undefined && { phone: data.phone ?? null }),
        ...(data.crpOrEquivalent !== undefined && { crpOrEquivalent: data.crpOrEquivalent ?? null }),
        ...(data.bio !== undefined && { bio: data.bio ?? null }),
        ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl ?? null }),
        ...(data.tenantId !== undefined && { tenantId: data.tenantId ?? null }),
        ...(data.calendarBlocked !== undefined && { calendarBlocked: data.calendarBlocked }),
        ...(data.attendanceLog !== undefined && { attendanceLog: data.attendanceLog as object }),
        ...(data.performanceSheet !== undefined && { performanceSheet: data.performanceSheet as object }),
      },
      include: { tenant: { select: { id: true, name: true, slug: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.psychologist.delete({ where: { id } });
    return { success: true };
  }
}
