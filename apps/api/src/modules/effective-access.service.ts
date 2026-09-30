import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { moduleMatrixRoleSlug } from './module-matrix-role.util';
import {
  expandImplications,
  resolveEffectiveModuleSlugs,
  type ModuleOverrideEffect,
} from './effective-access.util';

export type EffectiveAccessBreakdown = {
  userId: string;
  role: string;
  platformFunctionId: string | null;
  platformFunctionName: string | null;
  inheritedSlugs: string[];
  allowSlugs: string[];
  denySlugs: string[];
  effectiveSlugs: string[];
};

@Injectable()
export class EffectiveAccessService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadModuleCatalog() {
    const rows = await this.prisma.module.findMany({
      orderBy: { sortOrder: 'asc' },
      select: { slug: true, impliesSlug: true, name: true, functionalArea: true, sortOrder: true },
    });
    return rows;
  }

  async resolvePlatformFunctionId(userId: string, role: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { platformFunctionId: true },
    });
    if (user?.platformFunctionId) return user.platformFunctionId;

    const legacy = moduleMatrixRoleSlug(role);
    const fn = await this.prisma.jobRole.findFirst({
      where: { scope: 'platform', platformLegacyRole: legacy },
      select: { id: true },
    });
    return fn?.id ?? null;
  }

  async getBaseSlugsForFunction(functionId: string): Promise<string[]> {
    const rows = await this.prisma.jobRoleModuleDefault.findMany({
      where: { jobRoleId: functionId },
      include: { module: { select: { slug: true } } },
    });
    return rows.map((r) => r.module.slug);
  }

  /** Perfil legado sem usuário autenticado — só defaults da função plataforma (fail-closed). */
  async getEffectiveSlugsForRole(role: string): Promise<string[]> {
    if (role === 'super_admin') {
      const all = await this.prisma.module.findMany({ select: { slug: true } });
      return all.map((m) => m.slug);
    }
    const catalog = await this.loadModuleCatalog();
    const allModuleSlugs = catalog.map((m) => m.slug);
    const implications = catalog.map((m) => ({ slug: m.slug, impliesSlug: m.impliesSlug }));
    const legacy = moduleMatrixRoleSlug(role);
    const fn = await this.prisma.jobRole.findFirst({
      where: { scope: 'platform', platformLegacyRole: legacy, isActive: true },
    });
    const baseSlugs = fn ? await this.getBaseSlugsForFunction(fn.id) : [];
    return resolveEffectiveModuleSlugs({
      role,
      allModuleSlugs,
      implications,
      baseSlugs,
      overrides: [],
    });
  }

  async getEffectiveSlugsForUser(userId: string, role: string): Promise<string[]> {
    if (role === 'super_admin') {
      const all = await this.prisma.module.findMany({ select: { slug: true } });
      return all.map((m) => m.slug);
    }

    const catalog = await this.loadModuleCatalog();
    const allModuleSlugs = catalog.map((m) => m.slug);
    const implications = catalog.map((m) => ({ slug: m.slug, impliesSlug: m.impliesSlug }));

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        customModuleAccess: true,
        platformFunctionId: true,
        moduleOverrides: { include: { module: { select: { slug: true } } } },
        moduleAccess: { include: { module: { select: { slug: true } } } },
      },
    });
    if (!user) return [];

    const functionId =
      user.platformFunctionId ?? (await this.resolvePlatformFunctionId(userId, role));

    let baseSlugs: string[] = [];
    if (functionId) {
      baseSlugs = await this.getBaseSlugsForFunction(functionId);
    } else if (user.customModuleAccess) {
      baseSlugs = user.moduleAccess.filter((a) => a.canAccess).map((a) => a.module.slug);
      baseSlugs = expandImplications(baseSlugs, implications);
      return baseSlugs.filter((s) => allModuleSlugs.includes(s)).sort();
    } else {
      const matrixRole = moduleMatrixRoleSlug(role);
      const rows = await this.prisma.moduleRole.findMany({
        where: { role: matrixRole, canAccess: true },
        include: { module: true },
      });
      baseSlugs = rows.map((r) => r.module.slug);
    }

    const overrides =
      user.moduleOverrides.length > 0
        ? user.moduleOverrides.map((o) => ({
            slug: o.module.slug,
            effect: o.effect as ModuleOverrideEffect,
          }))
        : await this.legacyOverridesFromCustomSnapshot(userId, user.customModuleAccess, functionId, baseSlugs);

    return resolveEffectiveModuleSlugs({
      role,
      allModuleSlugs,
      implications,
      baseSlugs,
      overrides,
    });
  }

  /** Converte snapshot legado (UserModuleAccess) em ALLOW/DENY vs defaults da função. */
  private async legacyOverridesFromCustomSnapshot(
    userId: string,
    customModuleAccess: boolean,
    functionId: string | null,
    baseSlugs: string[],
  ): Promise<Array<{ slug: string; effect: ModuleOverrideEffect }>> {
    if (!customModuleAccess) return [];

    const rows = await this.prisma.userModuleAccess.findMany({
      where: { userId },
      include: { module: { select: { slug: true } } },
    });
    const base = new Set(baseSlugs);
    const out: Array<{ slug: string; effect: ModuleOverrideEffect }> = [];
    for (const row of rows) {
      const slug = row.module.slug;
      const inBase = base.has(slug);
      if (row.canAccess && !inBase) out.push({ slug, effect: 'allow' });
      if (!row.canAccess && inBase) out.push({ slug, effect: 'deny' });
    }
    if (functionId && out.length > 0) {
      await this.persistOverridesFromLegacy(userId, out);
      await this.prisma.user.update({
        where: { id: userId },
        data: { customModuleAccess: false },
      });
    }
    return out;
  }

  private async persistOverridesFromLegacy(
    userId: string,
    overrides: Array<{ slug: string; effect: ModuleOverrideEffect }>,
  ): Promise<void> {
    for (const o of overrides) {
      const mod = await this.prisma.module.findUnique({ where: { slug: o.slug } });
      if (!mod) continue;
      await this.prisma.userModuleOverride.upsert({
        where: { userId_moduleId: { userId, moduleId: mod.id } },
        create: { userId, moduleId: mod.id, effect: o.effect },
        update: { effect: o.effect },
      });
    }
  }

  async getBreakdownForUser(userId: string): Promise<EffectiveAccessBreakdown | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        platformFunctionId: true,
        platformFunction: { select: { name: true } },
        moduleOverrides: { include: { module: { select: { slug: true } } } },
      },
    });
    if (!user) return null;

    const role = user.role ?? 'editor';
    const functionId =
      user.platformFunctionId ?? (await this.resolvePlatformFunctionId(userId, role));
    const inheritedSlugs = functionId ? await this.getBaseSlugsForFunction(functionId) : [];
    const allowSlugs = user.moduleOverrides.filter((o) => o.effect === 'allow').map((o) => o.module.slug);
    const denySlugs = user.moduleOverrides.filter((o) => o.effect === 'deny').map((o) => o.module.slug);
    const effectiveSlugs = await this.getEffectiveSlugsForUser(userId, role);

    return {
      userId: user.id,
      role,
      platformFunctionId: functionId,
      platformFunctionName: user.platformFunction?.name ?? null,
      inheritedSlugs,
      allowSlugs,
      denySlugs,
      effectiveSlugs,
    };
  }

  async restoreUserToFunctionDefaults(userId: string): Promise<void> {
    await this.prisma.userModuleOverride.deleteMany({ where: { userId } });
    await this.prisma.userModuleAccess.deleteMany({ where: { userId } });
    await this.prisma.user.update({
      where: { id: userId },
      data: { customModuleAccess: false },
    });
  }

  async createPlatformFunction(data: {
    name: string;
    code?: string | null;
    description?: string | null;
    platformFamily?: string | null;
    platformLegacyRole?: string | null;
  }) {
    return this.prisma.jobRole.create({
      data: {
        tenantId: null,
        scope: 'platform',
        type: 'staff',
        forFootball: false,
        name: data.name.trim(),
        code: data.code?.trim() || null,
        description: data.description ?? null,
        platformFamily: data.platformFamily ?? null,
        platformLegacyRole: data.platformLegacyRole ?? null,
        isActive: true,
      },
    });
  }

  async updatePlatformFunction(
    id: string,
    data: {
      name?: string;
      code?: string | null;
      description?: string | null;
      platformFamily?: string | null;
      isActive?: boolean;
    },
  ) {
    return this.prisma.jobRole.update({
      where: { id },
      data: {
        ...(data.name != null && { name: data.name.trim() }),
        ...(data.code !== undefined && { code: data.code?.trim() || null }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.platformFamily !== undefined && { platformFamily: data.platformFamily }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  async listCup360AccessAudit(limit = 50) {
    return this.prisma.cup360AccessAudit.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });
  }

  async listPlatformFunctions() {
    return this.prisma.jobRole.findMany({
      where: { scope: 'platform' },
      orderBy: { name: 'asc' },
      include: {
        moduleDefaults: { include: { module: { select: { slug: true, name: true, functionalArea: true } } } },
        _count: { select: { platformUsers: true } },
      },
    });
  }

  async updatePlatformFunctionDefaults(functionId: string, moduleSlugs: string[]): Promise<void> {
    const fn = await this.prisma.jobRole.findFirst({
      where: { id: functionId, scope: 'platform' },
    });
    if (!fn) return;

    const modules = await this.prisma.module.findMany({
      where: { slug: { in: moduleSlugs } },
      select: { id: true, slug: true },
    });
    const wanted = new Set(modules.map((m) => m.id));

    const existing = await this.prisma.jobRoleModuleDefault.findMany({
      where: { jobRoleId: functionId },
      select: { id: true, moduleId: true },
    });

    for (const row of existing) {
      if (!wanted.has(row.moduleId)) {
        await this.prisma.jobRoleModuleDefault.delete({ where: { id: row.id } });
      }
    }
    for (const mod of modules) {
      await this.prisma.jobRoleModuleDefault.upsert({
        where: { jobRoleId_moduleId: { jobRoleId: functionId, moduleId: mod.id } },
        create: { jobRoleId: functionId, moduleId: mod.id },
        update: {},
      });
    }
  }

  async updateUserAccess(
    userId: string,
    data: { platformFunctionId?: string | null; allowSlugs?: string[]; denySlugs?: string[] },
  ): Promise<void> {
    if (data.platformFunctionId !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          platformFunctionId: data.platformFunctionId,
          customModuleAccess: false,
        },
      });
    }

    const allow = new Set(data.allowSlugs ?? []);
    const deny = new Set(data.denySlugs ?? []);

    if (data.allowSlugs !== undefined || data.denySlugs !== undefined) {
      await this.prisma.userModuleOverride.deleteMany({ where: { userId } });
      const slugs = [...allow, ...deny];
      const modules = await this.prisma.module.findMany({
        where: { slug: { in: slugs } },
        select: { id: true, slug: true },
      });
      for (const mod of modules) {
        const effect = deny.has(mod.slug) ? 'deny' : 'allow';
        await this.prisma.userModuleOverride.create({
          data: { userId, moduleId: mod.id, effect },
        });
      }
      await this.prisma.userModuleAccess.deleteMany({ where: { userId } });
      await this.prisma.user.update({
        where: { id: userId },
        data: { customModuleAccess: false },
      });
    }
  }

  async listModulesForAdmin() {
    return this.prisma.module.findMany({
      orderBy: [{ functionalArea: 'asc' }, { sortOrder: 'asc' }],
      select: { slug: true, name: true, functionalArea: true, sortOrder: true },
    });
  }
}
