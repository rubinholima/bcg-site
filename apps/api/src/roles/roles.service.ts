import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  getAssignableRolesCache,
  invalidateRolesRuntimeCache,
  setRolesRuntimeCache,
} from './roles.cache';

export interface PlatformRoleDto {
  slug: string;
  label: string;
  sortOrder: number;
  canAccessDashboard: boolean;
  includeInMatrix: boolean;
  isSystem: boolean;
  isActive: boolean;
  userCount: number;
}

const SLUG_RE = /^[a-z][a-z0-9_]{1,48}$/;

function normalizeRoleLabel(label: string): string {
  return label.trim().toLocaleUpperCase('pt-BR');
}

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.refreshRuntimeCache();
  }

  async refreshRuntimeCache() {
    const rows = await this.prisma.platformRole.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    setRolesRuntimeCache({
      dashboardSlugs: rows.filter((r) => r.canAccessDashboard).map((r) => r.slug),
      matrixSlugs: rows.filter((r) => r.includeInMatrix).map((r) => r.slug),
      assignable: rows.map((r) => ({
        slug: r.slug,
        label: r.label,
        sortOrder: r.sortOrder,
        canAccessDashboard: r.canAccessDashboard,
        includeInMatrix: r.includeInMatrix,
        isSystem: r.isSystem,
        isActive: r.isActive,
      })),
    });
  }

  async getManagedRoleSlugs(): Promise<string[]> {
    const cached = getAssignableRolesCache();
    if (cached) {
      return cached.filter((r) => r.includeInMatrix).map((r) => r.slug);
    }
    const rows = await this.prisma.platformRole.findMany({
      where: { isActive: true, includeInMatrix: true },
      orderBy: { sortOrder: 'asc' },
      select: { slug: true },
    });
    return rows.map((r) => r.slug);
  }

  async listAll(options?: { includeInactive?: boolean }): Promise<PlatformRoleDto[]> {
    const rows = await this.prisma.platformRole.findMany({
      where: options?.includeInactive ? undefined : { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    const counts = await this.prisma.user.groupBy({
      by: ['role'],
      where: { role: { not: null } },
      _count: { role: true },
    });
    const countMap = new Map(counts.map((c) => [c.role ?? '', c._count.role]));
    return rows.map((r) => ({
      slug: r.slug,
      label: normalizeRoleLabel(r.label),
      sortOrder: r.sortOrder,
      canAccessDashboard: r.canAccessDashboard,
      includeInMatrix: r.includeInMatrix,
      isSystem: r.isSystem,
      isActive: r.isActive,
      userCount: countMap.get(r.slug) ?? 0,
    }));
  }

  async isAssignableRole(slug: string): Promise<boolean> {
    const row = await this.prisma.platformRole.findUnique({ where: { slug } });
    return Boolean(row?.isActive);
  }

  async create(input: {
    slug: string;
    label: string;
    sortOrder?: number;
    canAccessDashboard?: boolean;
    includeInMatrix?: boolean;
  }): Promise<PlatformRoleDto> {
    const slug = input.slug.trim().toLowerCase();
    const label = normalizeRoleLabel(input.label);
    if (!SLUG_RE.test(slug)) {
      throw new BadRequestException(
        'Slug inválido — use minúsculas, números e underscore (ex.: coordenador_base)',
      );
    }
    if (slug === 'super_admin') {
      throw new BadRequestException('O perfil super_admin é reservado do sistema');
    }
    if (!label) throw new BadRequestException('Nome do perfil é obrigatório');

    const existing = await this.prisma.platformRole.findUnique({ where: { slug } });
    if (existing) throw new ConflictException('Já existe um perfil com este slug');

    const maxSort = await this.prisma.platformRole.aggregate({ _max: { sortOrder: true } });
    const sortOrder = input.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 10;

    await this.prisma.platformRole.create({
      data: {
        slug,
        label,
        sortOrder,
        canAccessDashboard: input.canAccessDashboard ?? true,
        includeInMatrix: input.includeInMatrix ?? true,
        isSystem: false,
        isActive: true,
      },
    });

    if (input.includeInMatrix !== false) {
      await this.backfillModuleRoles(slug);
    }

    await this.refreshRuntimeCache();
    const list = await this.listAll({ includeInactive: true });
    return list.find((r) => r.slug === slug)!;
  }

  async update(
    slug: string,
    input: {
      label?: string;
      sortOrder?: number;
      canAccessDashboard?: boolean;
      includeInMatrix?: boolean;
      isActive?: boolean;
    },
  ): Promise<PlatformRoleDto> {
    const row = await this.prisma.platformRole.findUnique({ where: { slug } });
    if (!row) throw new NotFoundException('Perfil não encontrado');

    if (row.isSystem && row.slug === 'super_admin' && input.canAccessDashboard === false) {
      throw new BadRequestException('super_admin sempre tem acesso ao dashboard');
    }
    if (row.isSystem && row.slug === 'user' && input.canAccessDashboard === true) {
      throw new BadRequestException('user não deve ter acesso ao dashboard');
    }

    const includeInMatrix =
      input.includeInMatrix !== undefined ? input.includeInMatrix : row.includeInMatrix;
    const wasInMatrix = row.includeInMatrix;

    await this.prisma.platformRole.update({
      where: { slug },
      data: {
        ...(input.label !== undefined ? { label: normalizeRoleLabel(input.label) } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.canAccessDashboard !== undefined
          ? { canAccessDashboard: input.canAccessDashboard }
          : {}),
        ...(input.includeInMatrix !== undefined ? { includeInMatrix: input.includeInMatrix } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });

    if (includeInMatrix && !wasInMatrix) {
      await this.backfillModuleRoles(slug);
    }

    await this.refreshRuntimeCache();
    const list = await this.listAll({ includeInactive: true });
    return list.find((r) => r.slug === slug)!;
  }

  async remove(slug: string): Promise<void> {
    const row = await this.prisma.platformRole.findUnique({ where: { slug } });
    if (!row) throw new NotFoundException('Perfil não encontrado');
    if (row.isSystem) {
      throw new BadRequestException('Perfis do sistema não podem ser excluídos');
    }

    const users = await this.prisma.user.count({ where: { role: slug } });
    if (users > 0) {
      throw new BadRequestException(
        `Existem ${users} usuário(s) com este perfil — reatribua antes de excluir`,
      );
    }

    await this.prisma.$transaction([
      this.prisma.moduleRole.deleteMany({ where: { role: slug } }),
      this.prisma.platformRole.delete({ where: { slug } }),
    ]);

    invalidateRolesRuntimeCache();
    await this.refreshRuntimeCache();
  }

  private async backfillModuleRoles(roleSlug: string) {
    const modules = await this.prisma.module.findMany({ select: { id: true } });
    for (const mod of modules) {
      await this.prisma.moduleRole.upsert({
        where: { moduleId_role: { moduleId: mod.id, role: roleSlug } },
        create: { moduleId: mod.id, role: roleSlug, canAccess: false },
        update: {},
      });
    }
  }
}
