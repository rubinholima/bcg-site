import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RolesService } from '../roles/roles.service';
import {
  isFootballManagementRole,
  isFootballOperationalModuleSlug,
} from './football-domain-access.util';

export interface ModuleWithPermissions {
  slug: string;
  name: string;
  sortOrder: number;
  functionalArea: string;
  permissions: Record<string, boolean>;
}

export interface MatrixChangeRow {
  slug: string;
  role: string;
  from: boolean;
  to: boolean;
}

export interface ModuleCatalogEntry {
  slug: string;
  name: string;
  sortOrder?: number;
  functionalArea?: string;
  impliesSlug?: string;
}

export interface UserModulePermissions {
  userId: string;
  email: string;
  name: string | null;
  role: string;
  customModuleAccess: boolean;
  permissions: Record<string, boolean>;
}

function getRoleAccess(roles: { role: string; canAccess: boolean }[], role: string): boolean {
  return roles.find((r) => r.role === role)?.canAccess ?? false;
}

function buildPermissionsMap(
  roles: { role: string; canAccess: boolean }[],
  managedSlugs: string[],
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const role of managedSlugs) {
    out[role] = getRoleAccess(roles, role);
  }
  return out;
}

/** Compara dois estados da matriz e retorna só células que mudaram. */
export function computeMatrixChanges(
  before: ModuleWithPermissions[],
  after: ModuleWithPermissions[],
  touchedSlugs: Set<string>,
  managedRoles: string[],
): MatrixChangeRow[] {
  const beforeMap = new Map(before.map((m) => [m.slug, m]));
  const afterMap = new Map(after.map((m) => [m.slug, m]));
  const changes: MatrixChangeRow[] = [];
  for (const slug of touchedSlugs) {
    const a = afterMap.get(slug);
    const b = beforeMap.get(slug);
    if (!a || !b) continue;
    for (const role of managedRoles) {
      const from = b.permissions[role] ?? false;
      const to = a.permissions[role] ?? false;
      if (from !== to) {
        changes.push({ slug, role, from, to });
      }
    }
  }
  return changes;
}

@Injectable()
export class ModulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rolesService: RolesService,
  ) {}

  private async managedRoles(): Promise<string[]> {
    return this.rolesService.getManagedRoleSlugs();
  }

  private async expandModuleSlugs(slugs: string[]): Promise<string[]> {
    const out = new Set(slugs);
    if (slugs.length === 0) return [];

    const modules = await this.prisma.module.findMany({
      where: { slug: { in: slugs } },
      select: { slug: true, impliesSlug: true },
    });
    for (const mod of modules) {
      if (mod.impliesSlug) out.add(mod.impliesSlug);
    }
    return Array.from(out);
  }

  /** Slugs operacionais do domínio Futebol — base da regra Gestor/Gerente/Supervisor. */
  async getFootballOperationalModuleSlugs(): Promise<string[]> {
    const modules = await this.prisma.module.findMany({
      select: { slug: true, functionalArea: true },
      orderBy: { sortOrder: 'asc' },
    });
    return modules
      .filter((m) => isFootballOperationalModuleSlug(m.slug, m.functionalArea))
      .map((m) => m.slug);
  }

  private async mergeFootballManagementAccess(role: string, slugs: string[]): Promise<string[]> {
    if (!isFootballManagementRole(role)) return slugs;
    const footballSlugs = await this.getFootballOperationalModuleSlugs();
    return this.expandModuleSlugs([...new Set([...slugs, ...footballSlugs])]);
  }

  async getSlugsForRole(role: string): Promise<string[]> {
    const rows = await this.prisma.moduleRole.findMany({
      where: { role, canAccess: true },
      include: { module: true },
      orderBy: { module: { sortOrder: 'asc' } },
    });
    const raw = rows.map((r) => r.module.slug);
    const expanded = await this.expandModuleSlugs(raw);
    return this.mergeFootballManagementAccess(role, expanded);
  }

  async getAllModuleSlugs(): Promise<string[]> {
    const rows = await this.prisma.module.findMany({
      orderBy: { sortOrder: 'asc' },
      select: { slug: true },
    });
    return rows.map((r) => r.slug);
  }

  async findUserIdByActorSub(actorSub: string): Promise<string | null> {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ cognitoSub: actorSub }, { id: actorSub }] },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  async getSlugsForUser(userId: string, role: string): Promise<string[]> {
    if (role === 'super_admin') {
      return this.getAllModuleSlugs();
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { customModuleAccess: true },
    });
    if (user?.customModuleAccess) {
      const rows = await this.prisma.userModuleAccess.findMany({
        where: { userId, canAccess: true },
        include: { module: true },
        orderBy: { module: { sortOrder: 'asc' } },
      });
      const raw = rows.map((r) => r.module.slug);
      return this.expandModuleSlugs(raw);
    }
    return this.getSlugsForRole(role);
  }

  async getSlugsForActor(actorSub: string, role: string): Promise<string[]> {
    if (role === 'super_admin') {
      return this.getAllModuleSlugs();
    }
    const userId = await this.findUserIdByActorSub(actorSub);
    if (!userId) {
      return this.getSlugsForRole(role);
    }
    return this.getSlugsForUser(userId, role);
  }

  async syncModuleCatalog(catalog: ModuleCatalogEntry[]): Promise<{ created: number; updated: number }> {
    const managed = await this.managedRoles();
    let created = 0;
    let updated = 0;
    for (let i = 0; i < catalog.length; i++) {
      const entry = catalog[i];
      const sortOrder = entry.sortOrder ?? i;
      const existing = await this.prisma.module.findUnique({ where: { slug: entry.slug } });
      if (existing) {
        await this.prisma.module.update({
          where: { id: existing.id },
          data: {
            name: entry.name,
            sortOrder,
            ...(entry.functionalArea ? { functionalArea: entry.functionalArea } : {}),
            impliesSlug: entry.impliesSlug ?? null,
          },
        });
        updated++;
      } else {
        const mod = await this.prisma.module.create({
          data: {
            slug: entry.slug,
            name: entry.name,
            sortOrder,
            functionalArea: entry.functionalArea ?? 'outros',
            impliesSlug: entry.impliesSlug ?? null,
          },
        });
        for (const role of managed) {
          await this.prisma.moduleRole.create({
            data: { moduleId: mod.id, role, canAccess: false },
          });
        }
        created++;
      }
    }
    await this.migrateLegacyGroupOmiePermissions();
    await this.backfillMissingModuleRoles(managed);
    return { created, updated };
  }

  /** Garante linha ModuleRole para todo par (módulo × perfil da matriz) — evita células órfãs. */
  private async backfillMissingModuleRoles(managedRoles: string[]): Promise<void> {
    if (managedRoles.length === 0) return;
    const modules = await this.prisma.module.findMany({ select: { id: true } });
    for (const role of managedRoles) {
      for (const mod of modules) {
        await this.prisma.moduleRole.upsert({
          where: { moduleId_role: { moduleId: mod.id, role } },
          create: { moduleId: mod.id, role, canAccess: false },
          update: {},
        });
      }
    }
  }

  private async migrateLegacyGroupOmiePermissions(): Promise<void> {
    const legacySlug = 'group_omie';
    const targetSlugs = ['adm__adm_financeiro', 'adm__adm_compras', 'adm__adm_estoque'];
    const managed = await this.managedRoles();

    const legacy = await this.prisma.module.findUnique({ where: { slug: legacySlug } });
    if (!legacy) return;

    const targets = await this.prisma.module.findMany({
      where: { slug: { in: targetSlugs } },
      select: { id: true, slug: true },
    });
    if (targets.length === 0) return;

    for (const role of managed) {
      const legacyRole = await this.prisma.moduleRole.findUnique({
        where: { moduleId_role: { moduleId: legacy.id, role } },
      });
      if (!legacyRole?.canAccess) continue;
      for (const target of targets) {
        await this.prisma.moduleRole.updateMany({
          where: { moduleId: target.id, role },
          data: { canAccess: true },
        });
      }
    }

    const legacyUserRows = await this.prisma.userModuleAccess.findMany({
      where: { moduleId: legacy.id, canAccess: true },
      select: { userId: true },
    });
    for (const { userId } of legacyUserRows) {
      for (const target of targets) {
        await this.prisma.userModuleAccess.upsert({
          where: { userId_moduleId: { userId, moduleId: target.id } },
          create: { userId, moduleId: target.id, canAccess: true },
          update: { canAccess: true },
        });
      }
    }
  }

  async getUserModulePermissions(userId: string): Promise<UserModulePermissions | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, customModuleAccess: true },
    });
    if (!user) return null;

    const modules = await this.prisma.module.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        roles: true,
        userAccess: { where: { userId } },
      },
    });

    const role = user.role ?? 'editor';
    const permissions: Record<string, boolean> = {};

    for (const mod of modules) {
      if (user.customModuleAccess) {
        permissions[mod.slug] = mod.userAccess[0]?.canAccess ?? false;
      } else {
        permissions[mod.slug] = getRoleAccess(mod.roles, role);
      }
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role,
      customModuleAccess: user.customModuleAccess,
      permissions,
    };
  }

  async updateUserModulePermissions(
    userId: string,
    permissions: Record<string, boolean>,
    options?: { customModuleAccess?: boolean },
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const custom =
      options?.customModuleAccess !== undefined ? options.customModuleAccess : true;

    await this.prisma.user.update({
      where: { id: userId },
      data: { customModuleAccess: custom },
    });

    if (!custom) {
      await this.prisma.userModuleAccess.deleteMany({ where: { userId } });
      return;
    }

    for (const [slug, canAccess] of Object.entries(permissions)) {
      const module = await this.prisma.module.findUnique({ where: { slug } });
      if (!module) continue;
      await this.prisma.userModuleAccess.upsert({
        where: { userId_moduleId: { userId, moduleId: module.id } },
        create: { userId, moduleId: module.id, canAccess },
        update: { canAccess },
      });
    }
  }

  async copyRolePermissionsToUser(userId: string): Promise<UserModulePermissions | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!user) return null;
    const role = user.role ?? 'editor';
    const modules = await this.getAllWithPermissions();
    const permissions: Record<string, boolean> = {};
    for (const mod of modules) {
      if (role === 'super_admin') {
        permissions[mod.slug] = true;
      } else {
        permissions[mod.slug] = mod.permissions[role] ?? false;
      }
    }
    await this.updateUserModulePermissions(userId, permissions, { customModuleAccess: true });
    return this.getUserModulePermissions(userId);
  }

  private mapRow(
    m: {
      slug: string;
      name: string;
      sortOrder: number;
      functionalArea: string;
      roles: { role: string; canAccess: boolean }[];
    },
    managedSlugs: string[],
  ): ModuleWithPermissions {
    return {
      slug: m.slug,
      name: m.name,
      sortOrder: m.sortOrder,
      functionalArea: m.functionalArea,
      permissions: buildPermissionsMap(m.roles, managedSlugs),
    };
  }

  async getAllWithPermissions(): Promise<ModuleWithPermissions[]> {
    const managedSlugs = await this.managedRoles();
    const modules = await this.prisma.module.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { roles: true },
    });
    return modules.map((m) => this.mapRow(m, managedSlugs));
  }

  async getRecentAuditEntries(
    limit = 50,
    options?: { includeChanges?: boolean },
  ): Promise<
    Array<{
      id: string;
      createdAt: Date;
      actorSub: string;
      actorEmail: string | null;
      changeCount: number;
      changes?: MatrixChangeRow[];
    }>
  > {
    const rows = await this.prisma.permissionMatrixAudit.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });
    return rows.map((r) => {
      const raw = r.changes;
      const list = Array.isArray(raw) ? (raw as unknown as MatrixChangeRow[]) : [];
      return {
        id: r.id,
        createdAt: r.createdAt,
        actorSub: r.actorSub,
        actorEmail: r.actorEmail,
        changeCount: list.length,
        changes: options?.includeChanges ? list : undefined,
      };
    });
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

  async updatePermissions(
    permissions: Record<string, Record<string, boolean | undefined>>,
  ): Promise<void> {
    for (const [slug, perms] of Object.entries(permissions)) {
      const module = await this.prisma.module.findUnique({ where: { slug } });
      if (!module) continue;

      for (const [role, canAccess] of Object.entries(perms)) {
        if (canAccess === undefined) continue;
        await this.prisma.moduleRole.upsert({
          where: { moduleId_role: { moduleId: module.id, role } },
          create: { moduleId: module.id, role, canAccess },
          update: { canAccess },
        });
      }
    }
  }
}
