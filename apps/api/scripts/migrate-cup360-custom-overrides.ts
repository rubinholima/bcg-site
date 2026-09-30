/**
 * Pós-migration: converte usuários customModuleAccess em overrides ALLOW/DENY
 * preservando o acesso efetivo no momento da execução.
 *
 * Uso: pnpm --filter api exec ts-node -r tsconfig-paths/register scripts/migrate-cup360-custom-overrides.ts
 */
import { PrismaClient } from '@prisma/client';
import { moduleMatrixRoleSlug } from '../src/modules/module-matrix-role.util';
import { expandImplications, resolveEffectiveModuleSlugs } from '../src/modules/effective-access.util';

const prisma = new PrismaClient();

async function main() {
  const catalog = await prisma.module.findMany({
    select: { id: true, slug: true, impliesSlug: true },
  });
  const allSlugs = catalog.map((m) => m.slug);
  const implications = catalog.map((m) => ({ slug: m.slug, impliesSlug: m.impliesSlug }));

  const users = await prisma.user.findMany({
    where: { customModuleAccess: true },
    include: { moduleAccess: { include: { module: true } } },
  });

  for (const user of users) {
    const role = user.role ?? 'editor';
    const legacy = moduleMatrixRoleSlug(role);
    const fn =
      (user.platformFunctionId
        ? await prisma.jobRole.findUnique({ where: { id: user.platformFunctionId } })
        : null) ??
      (await prisma.jobRole.findFirst({ where: { scope: 'platform', platformLegacyRole: legacy } }));

    let baseSlugs: string[] = [];
    if (fn) {
      const defs = await prisma.jobRoleModuleDefault.findMany({
        where: { jobRoleId: fn.id },
        include: { module: true },
      });
      baseSlugs = defs.map((d) => d.module.slug);
    }

    const baseSet = new Set(expandImplications(baseSlugs, implications));
    const snapshot = new Map<string, boolean>();
    for (const row of user.moduleAccess) {
      snapshot.set(row.module.slug, row.canAccess);
    }

    const overrides: Array<{ slug: string; effect: 'allow' | 'deny' }> = [];
    for (const mod of catalog) {
      const desired = snapshot.get(mod.slug);
      if (desired === undefined) continue;
      const inBase = baseSet.has(mod.slug);
      if (desired && !inBase) overrides.push({ slug: mod.slug, effect: 'allow' });
      if (!desired && inBase) overrides.push({ slug: mod.slug, effect: 'deny' });
    }

    await prisma.userModuleOverride.deleteMany({ where: { userId: user.id } });
    for (const o of overrides) {
      const mod = catalog.find((m) => m.slug === o.slug);
      if (!mod) continue;
      await prisma.userModuleOverride.create({
        data: { userId: user.id, moduleId: mod.id, effect: o.effect },
      });
    }

    if (fn && !user.platformFunctionId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { platformFunctionId: fn.id },
      });
    }

    await prisma.userModuleAccess.deleteMany({ where: { userId: user.id } });
    await prisma.user.update({
      where: { id: user.id },
      data: { customModuleAccess: false },
    });

    const effective = resolveEffectiveModuleSlugs({
      role,
      allModuleSlugs: allSlugs,
      implications,
      baseSlugs,
      overrides,
    });
    const oldEffective = [...snapshot.entries()]
      .filter(([, v]) => v)
      .map(([s]) => s)
      .sort();
    console.log(user.email, 'overrides', overrides.length, 'effective', effective.length, 'was', oldEffective.length);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
