import { Injectable, NotFoundException } from '@nestjs/common';
import { cadastroEmail, cadastroUpper, cadastroUpperRequired } from '../common/cadastro-text';
import { PrismaService } from '../prisma/prisma.service';
import { HEALTH_INTERN_AREAS } from './dto/create-health-intern.dto';

@Injectable()
export class HealthInternsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(opts?: {
    tenantId?: string;
    area?: string;
    activeOnly?: boolean;
    search?: string;
  }) {
    const area = opts?.area?.trim().toLowerCase();
    const areaFilter =
      area && (HEALTH_INTERN_AREAS as readonly string[]).includes(area)
        ? area
        : undefined;
    const search = opts?.search?.trim();

    const where: {
      area?: string;
      active?: boolean;
      OR?: Array<
        | { tenantId: string }
        | { tenantId: null }
        | { name: { contains: string; mode: 'insensitive' } }
      >;
      AND?: Array<{ OR: Array<{ tenantId: string } | { tenantId: null }> }>;
      name?: { contains: string; mode: 'insensitive' };
    } = {};

    if (areaFilter) where.area = areaFilter;
    if (opts?.activeOnly) where.active = true;

    if (opts?.tenantId) {
      where.AND = [
        {
          OR: [{ tenantId: opts.tenantId }, { tenantId: null }],
        },
      ];
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    return this.prisma.healthIntern.findMany({
      where,
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        supervisor: { select: { id: true, name: true } },
      },
      orderBy: [{ name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.healthIntern.findUnique({
      where: { id },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        supervisor: { select: { id: true, name: true } },
      },
    });
    if (!row) throw new NotFoundException('Estagiário não encontrado');
    return row;
  }

  async create(data: {
    name: string;
    area: string;
    photoUrl?: string;
    email?: string;
    phone?: string;
    registry?: string;
    bio?: string;
    notes?: string;
    tenantId?: string;
    supervisorId?: string;
    active?: boolean;
  }) {
    const area = data.area.trim().toLowerCase();
    return this.prisma.healthIntern.create({
      data: {
        name: cadastroUpperRequired(data.name),
        area,
        photoUrl: data.photoUrl ?? null,
        email: cadastroEmail(data.email),
        phone: cadastroUpper(data.phone),
        registry: cadastroUpper(data.registry),
        bio: cadastroUpper(data.bio),
        notes: cadastroUpper(data.notes),
        tenantId: data.tenantId ?? null,
        supervisorId: area === 'psicologia' ? (data.supervisorId ?? null) : null,
        active: data.active !== false,
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        supervisor: { select: { id: true, name: true } },
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      area: string;
      photoUrl: string | null;
      email: string;
      phone: string;
      registry: string;
      bio: string;
      notes: string;
      tenantId: string | null;
      supervisorId: string | null;
      active: boolean;
    }>,
  ) {
    const existing = await this.findOne(id);
    const nextArea = (data.area ?? existing.area).trim().toLowerCase();
    return this.prisma.healthIntern.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: cadastroUpperRequired(data.name) }),
        ...(data.area !== undefined && { area: nextArea }),
        ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl }),
        ...(data.email !== undefined && { email: cadastroEmail(data.email) }),
        ...(data.phone !== undefined && { phone: cadastroUpper(data.phone) }),
        ...(data.registry !== undefined && { registry: cadastroUpper(data.registry) }),
        ...(data.bio !== undefined && { bio: cadastroUpper(data.bio) }),
        ...(data.notes !== undefined && { notes: cadastroUpper(data.notes) }),
        ...(data.tenantId !== undefined && { tenantId: data.tenantId }),
        ...(data.active !== undefined && { active: data.active }),
        ...(data.supervisorId !== undefined || data.area !== undefined
          ? {
              supervisorId:
                nextArea === 'psicologia'
                  ? data.supervisorId !== undefined
                    ? data.supervisorId
                    : existing.supervisorId
                  : null,
            }
          : {}),
      },
      include: {
        tenant: { select: { id: true, name: true, slug: true } },
        supervisor: { select: { id: true, name: true } },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.healthIntern.delete({ where: { id } });
    return { success: true };
  }
}
