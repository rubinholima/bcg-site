import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { cadastroEmail, cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
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
    staffRole?: string;
    supervisorId?: string;
    categories?: string[] | object;
    attendanceLog?: object | unknown;
    performanceSheet?: object | unknown;
  }) {
    return this.prisma.psychologist.create({
      data: {
        name: cadastroUpperRequired(data.name),
        email: cadastroEmail(data.email),
        phone: cadastroUpper(data.phone),
        crpOrEquivalent: cadastroUpper(data.crpOrEquivalent),
        bio: cadastroUpper(data.bio),
        photoUrl: data.photoUrl ?? null,
        tenantId: data.tenantId ?? null,
        staffRole: data.staffRole ?? 'psicologo',
        supervisorId: data.supervisorId ?? null,
        categories:
          data.categories === undefined || data.categories === null
            ? Prisma.JsonNull
            : (data.categories as object),
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
      staffRole?: string;
      supervisorId?: string;
      categories?: string[] | object;
      attendanceLog?: object | unknown;
      performanceSheet?: object | unknown;
    },
  ) {
    await this.findOne(id);
    return this.prisma.psychologist.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: cadastroUpperRequired(data.name) }),
        ...(data.email !== undefined && { email: cadastroEmail(data.email) }),
        ...(data.phone !== undefined && { phone: cadastroUpper(data.phone) }),
        ...(data.crpOrEquivalent !== undefined && { crpOrEquivalent: cadastroUpper(data.crpOrEquivalent) }),
        ...(data.bio !== undefined && { bio: cadastroUpper(data.bio) }),
        ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl ?? null }),
        ...(data.tenantId !== undefined && { tenantId: data.tenantId ?? null }),
        ...(data.staffRole !== undefined && { staffRole: data.staffRole }),
        ...(data.supervisorId !== undefined && { supervisorId: data.supervisorId ?? null }),
        ...(data.categories !== undefined && {
          categories:
            data.categories === null ? Prisma.JsonNull : (data.categories as object),
        }),
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
