import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const MANAGED_ROLES = [
  'company_admin',
  'editor',
  'analista',
  'diretoria',
  'medico',
  'psicologo',
] as const;

export type ManagedRoleKey = (typeof MANAGED_ROLES)[number];

export interface ModuleWithPermissions {
  slug: string;
  name: string;
  sortOrder: number;
  functionalArea: string;
  company_admin: boolean;
  editor: boolean;
  analista: boolean;
  diretoria: boolean;
  medico: boolean;
  psicologo: boolean;
}

export interface MatrixChangeRow {
  slug: string;
  role: string;
  from: boolean;
  to: boolean;
}

function getRoleAccess(roles: { role: string; canAccess: boolean }[], role: string): boolean {
  return roles.find((r) => r.role === role)?.canAccess ?? false;
}

/** Compara dois estados da matriz e retorna só células que mudaram. */
export function computeMatrixChanges(
  before: ModuleWithPermissions[],
  after: ModuleWithPermissions[],
  touchedSlugs: Set<string>,
): MatrixChangeRow[] {
  const beforeMap = new Map(before.map((m) => [m.slug, m]));
  const afterMap = new Map(after.map((m) => [m.slug, m]));
  const changes: MatrixChangeRow[] = [];
  for (const slug of touchedSlugs) {
    const a = afterMap.get(slug);
    const b = beforeMap.get(slug);
    if (!a || !b) continue;
    for (const role of MANAGED_ROLES) {
      if (b[role] !== a[role]) {
        changes.push({ slug, role, from: b[role], to: a[role] });
      }
    }
  }
  return changes;
}

@Injectable()
export class ModulesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista de slugs que a role pode acessar. */
  async getSlugsForRole(role: string): Promise<string[]> {
    const rows = await this.prisma.moduleRole.findMany({
      where: {
        role,
        canAccess: true,
      },
      include: { module: true },
      orderBy: { module: { sortOrder: 'asc' } },
    });
    return rows.map((r) => r.module.slug);
  }

  private mapRow(m: {
    slug: string;
    name: string;
    sortOrder: number;
    functionalArea: string;
    roles: { role: string; canAccess: boolean }[];
  }): ModuleWithPermissions {
    return {
      slug: m.slug,
      name: m.name,
      sortOrder: m.sortOrder,
      functionalArea: m.functionalArea,
      company_admin: getRoleAccess(m.roles, 'company_admin'),
      editor: getRoleAccess(m.roles, 'editor'),
      analista: getRoleAccess(m.roles, 'analista'),
      diretoria: getRoleAccess(m.roles, 'diretoria'),
      medico: getRoleAccess(m.roles, 'medico'),
      psicologo: getRoleAccess(m.roles, 'psicologo'),
    };
  }

  /** Todos os módulos com permissões (super_admin sempre true). Apenas super_admin. */
  async getAllWithPermissions(): Promise<ModuleWithPermissions[]> {
    const modules = await this.prisma.module.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { roles: true },
    });
    return modules.map((m) => this.mapRow(m));
  }

  /** Últimas alterações na matriz de permissões. */
  async getRecentAuditEntries(limit = 50): Promise<
    Array<{
      id: string;
      createdAt: Date;
      actorSub: string;
      actorEmail: string | null;
      changeCount: number;
    }>
  > {
    const rows = await this.prisma.permissionMatrixAudit.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });
    return rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      actorSub: r.actorSub,
      actorEmail: r.actorEmail,
      changeCount: Array.isArray(r.changes as unknown[])
        ? (r.changes as unknown[]).length
        : 0,
    }));
  }

  async insertAudit(actorSub: string, actorEmail: string | undefined, changes: MatrixChangeRow[]): Promise<void> {
    if (!changes.length) return;
    await this.prisma.permissionMatrixAudit.create({
      data: {
        actorSub,
        actorEmail: actorEmail ?? null,
        changes: changes as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /** Atualiza permissões por slug. Apenas super_admin. */
  async updatePermissions(
    permissions: Record<string, Partial<Record<ManagedRoleKey, boolean>>>,
  ): Promise<void> {
    for (const [slug, perms] of Object.entries(permissions)) {
      const module = await this.prisma.module.findUnique({ where: { slug } });
      if (!module) continue;

      for (const role of MANAGED_ROLES) {
        const canAccess = perms[role];
        if (canAccess === undefined) continue;
        await this.prisma.moduleRole.upsert({
          where: {
            moduleId_role: { moduleId: module.id, role },
          },
          create: {
            moduleId: module.id,
            role,
            canAccess,
          },
          update: { canAccess },
        });
      }
    }
  }
}
