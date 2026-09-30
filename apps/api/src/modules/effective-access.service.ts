import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { CognitoJwtPayload } from '../auth/jwt-auth.guard';
import { moduleMatrixRoleSlug } from './module-matrix-role.util';
import {
  expandImplications,
  resolveEffectiveModuleSlugs,
  type ModuleOverrideEffect,
} from './effective-access.util';
import { computeLegacyProfileSlugs } from './legacy-profile-access.util';

export type EffectiveAccessBreakdown = {
  userId: string;
  role: string;
  platformFunctionId: string | null;
  platformFunctionName: string | null;
  /** Defaults da função (JobRoleModuleDefault). */
  functionDefaultSlugs: string[];
  /** Matriz legado ModuleRole (somente exibição). */
  legacyProfileSlugs: string[];
  /** União função + perfil legado — somente exibição HERDADO. */
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

  /**
   * Slugs concedidos pela matriz ModuleRole + auto-grant Futebol (gestão), espelhando runtime legado.
   */
  async getLegacyProfileSlugsForRole(
    role: string,
    catalog: Array<{ slug: string; impliesSlug: string | null; functionalArea: string | null }>,
    allModuleSlugs: string[],
  ): Promise<string[]> {
    const matrixRole = moduleMatrixRoleSlug(role);
    const rows = await this.prisma.moduleRole.findMany({
      where: { role: matrixRole, canAccess: true },
      include: { module: { select: { slug: true } } },
    });
    const matrixGrantSlugs = rows.map((r) => r.module.slug);
    return computeLegacyProfileSlugs(role, matrixGrantSlugs, catalog, allModuleSlugs);
  }

  /** Perfil legado sem usuário autenticado — função plataforma ∪ matriz ModuleRole. */
  async getEffectiveSlugsForRole(role: string): Promise<string[]> {
    if (role === 'super_admin') {
      const all = await this.prisma.module.findMany({ select: { slug: true } });
      return all.map((m) => m.slug);
    }
    const catalog = await this.loadModuleCatalog();
    const allModuleSlugs = catalog.map((m) => m.slug);
    const implications = catalog.map((m) => ({ slug: m.slug, impliesSlug: m.impliesSlug }));
    const legacyProfileSlugs = await this.getLegacyProfileSlugsForRole(role, catalog, allModuleSlugs);
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
      legacyProfileSlugs,
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

    const legacyProfileSlugs = await this.getLegacyProfileSlugsForRole(role, catalog, allModuleSlugs);

    const functionId =
      user.platformFunctionId ?? (await this.resolvePlatformFunctionId(userId, role));

    if (user.customModuleAccess && user.moduleOverrides.length === 0) {
      let customBase = user.moduleAccess.filter((a) => a.canAccess).map((a) => a.module.slug);
      customBase = expandImplications(customBase, implications);
      return resolveEffectiveModuleSlugs({
        role,
        allModuleSlugs,
        implications,
        baseSlugs: [],
        legacyProfileSlugs: [...new Set([...legacyProfileSlugs, ...customBase])],
        overrides: [],
      });
    }

    const baseSlugs = functionId ? await this.getBaseSlugsForFunction(functionId) : [];

    const overrides =
      user.moduleOverrides.length > 0
        ? user.moduleOverrides.map((o) => ({
            slug: o.module.slug,
            effect: o.effect as ModuleOverrideEffect,
          }))
        : await this.legacyOverridesFromCustomSnapshot(
            userId,
            user.customModuleAccess,
            functionId,
            [...new Set([...baseSlugs, ...legacyProfileSlugs])],
          );

    return resolveEffectiveModuleSlugs({
      role,
      allModuleSlugs,
      implications,
      baseSlugs,
      legacyProfileSlugs,
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
    const functionDefaultSlugs = functionId ? await this.getBaseSlugsForFunction(functionId) : [];
    const catalog = await this.loadModuleCatalog();
    const allModuleSlugs = catalog.map((m) => m.slug);
    const legacyProfileSlugs = await this.getLegacyProfileSlugsForRole(role, catalog, allModuleSlugs);
    const inheritedSlugs = [...new Set([...functionDefaultSlugs, ...legacyProfileSlugs])].sort();
    const allowSlugs = user.moduleOverrides.filter((o) => o.effect === 'allow').map((o) => o.module.slug);
    const denySlugs = user.moduleOverrides.filter((o) => o.effect === 'deny').map((o) => o.module.slug);
    const effectiveSlugs = await this.getEffectiveSlugsForUser(userId, role);

    return {
      userId: user.id,
      role,
      platformFunctionId: functionId,
      platformFunctionName: user.platformFunction?.name ?? null,
      functionDefaultSlugs,
      legacyProfileSlugs,
      inheritedSlugs,
      allowSlugs,
      denySlugs,
      effectiveSlugs,
    };
  }

  private actorFromRequest(user?: CognitoJwtPayload) {
    const sub = user?.sub ?? user?.['cognito:username'] ?? 'system';
    const email = user?.email ?? user?.['cognito:username'] ?? null;
    return { actorSub: String(sub), actorEmail: email ? String(email) : null };
  }

  private async writeAudit(entry: {
    actorSub: string;
    actorEmail: string | null;
    targetType: string;
    targetId: string;
    targetLabel?: string | null;
    moduleSlug?: string | null;
    changeType: string;
    before?: unknown;
    after?: unknown;
  }) {
    await this.prisma.cup360AccessAudit.create({
      data: {
        id: randomUUID(),
        actorSub: entry.actorSub,
        actorEmail: entry.actorEmail,
        targetType: entry.targetType,
        targetId: entry.targetId,
        targetLabel: entry.targetLabel ?? null,
        moduleSlug: entry.moduleSlug ?? null,
        changeType: entry.changeType,
        before: entry.before ?? undefined,
        after: entry.after ?? undefined,
      },
    });
  }

  async restoreUserToFunctionDefaults(userId: string, actor?: CognitoJwtPayload): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    const before = await this.getBreakdownForUser(userId);
    await this.prisma.userModuleOverride.deleteMany({ where: { userId } });
    await this.prisma.userModuleAccess.deleteMany({ where: { userId } });
    await this.prisma.user.update({
      where: { id: userId },
      data: { customModuleAccess: false },
    });
    const { actorSub, actorEmail } = this.actorFromRequest(actor);
    await this.writeAudit({
      actorSub,
      actorEmail,
      targetType: 'user',
      targetId: userId,
      targetLabel: user?.name ?? user?.email ?? userId,
      changeType: 'restore_function_defaults',
      before,
      after: await this.getBreakdownForUser(userId),
    });
  }

  async createPlatformFunction(
    data: {
      name: string;
      code?: string | null;
      description?: string | null;
      platformFamily?: string | null;
      platformLegacyRole?: string | null;
    },
    actor?: CognitoJwtPayload,
  ) {
    const fn = await this.prisma.jobRole.create({
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
    const { actorSub, actorEmail } = this.actorFromRequest(actor);
    await this.writeAudit({
      actorSub,
      actorEmail,
      targetType: 'function',
      targetId: fn.id,
      targetLabel: fn.name,
      changeType: 'function_create',
      after: { name: fn.name, code: fn.code, platformFamily: fn.platformFamily },
    });
    return fn;
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
    actor?: CognitoJwtPayload,
  ) {
    const before = await this.prisma.jobRole.findUnique({ where: { id } });
    const fn = await this.prisma.jobRole.update({
      where: { id },
      data: {
        ...(data.name != null && { name: data.name.trim() }),
        ...(data.code !== undefined && { code: data.code?.trim() || null }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.platformFamily !== undefined && { platformFamily: data.platformFamily }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
    const { actorSub, actorEmail } = this.actorFromRequest(actor);
    await this.writeAudit({
      actorSub,
      actorEmail,
      targetType: 'function',
      targetId: id,
      targetLabel: fn.name,
      changeType: 'function_update',
      before,
      after: fn,
    });
    return fn;
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

  async updatePlatformFunctionDefaults(
    functionId: string,
    moduleSlugs: string[],
    actor?: CognitoJwtPayload,
  ): Promise<void> {
    const fn = await this.prisma.jobRole.findFirst({
      where: { id: functionId, scope: 'platform' },
    });
    if (!fn) return;

    const beforeRows = await this.prisma.jobRoleModuleDefault.findMany({
      where: { jobRoleId: functionId },
      include: { module: { select: { slug: true } } },
    });
    const beforeSlugs = beforeRows.map((r) => r.module.slug).sort();

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

    const afterSlugs = [...moduleSlugs].sort();
    const { actorSub, actorEmail } = this.actorFromRequest(actor);
    await this.writeAudit({
      actorSub,
      actorEmail,
      targetType: 'function',
      targetId: functionId,
      targetLabel: fn.name,
      changeType: 'function_defaults',
      before: { moduleSlugs: beforeSlugs },
      after: { moduleSlugs: afterSlugs },
    });
  }

  async updateUserAccess(
    userId: string,
    data: { platformFunctionId?: string | null; allowSlugs?: string[]; denySlugs?: string[] },
    actor?: CognitoJwtPayload,
  ): Promise<void> {
    const before = await this.getBreakdownForUser(userId);

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

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    const after = await this.getBreakdownForUser(userId);
    const { actorSub, actorEmail } = this.actorFromRequest(actor);
    await this.writeAudit({
      actorSub,
      actorEmail,
      targetType: 'user',
      targetId: userId,
      targetLabel: user?.name ?? user?.email ?? userId,
      changeType: 'user_access',
      before,
      after,
    });
  }

  async listModulesForAdmin() {
    return this.prisma.module.findMany({
      orderBy: [{ functionalArea: 'asc' }, { sortOrder: 'asc' }],
      select: { slug: true, name: true, functionalArea: true, sortOrder: true },
    });
  }
}
