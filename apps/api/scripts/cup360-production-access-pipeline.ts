/**
 * Pipeline produção: backfill defaults + conversão customModuleAccess + comparação.
 * Falha (exit 1) se algum usuário perder/ganhar acesso vs legado.
 *
 * Uso (DATABASE_URL produção):
 *   pnpm --filter api exec ts-node -r tsconfig-paths/register scripts/cup360-production-access-pipeline.ts
 */
import { PrismaClient } from '@prisma/client';
import { moduleMatrixRoleSlug } from '../src/modules/module-matrix-role.util';
import {
  expandImplications,
  resolveEffectiveModuleSlugs,
} from '../src/modules/effective-access.util';
import {
  isFootballManagementRole,
  isFootballOperationalModuleSlug,
} from '../src/modules/football-domain-access.util';

const prisma = new PrismaClient();

function setsEqual(a: string[], b: string[]): boolean {
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size !== sb.size) return false;
  for (const x of sa) if (!sb.has(x)) return false;
  return true;
}

async function legacyEffectiveSlugs(userId: string, role: string, custom: boolean): Promise<string[]> {
  if (role === 'super_admin') {
    return (await prisma.module.findMany({ select: { slug: true } })).map((m) => m.slug).sort();
  }
  const catalog = await prisma.module.findMany({
    select: { slug: true, impliesSlug: true, functionalArea: true },
  });
  const all = catalog.map((m) => m.slug);
  const implications = catalog.map((m) => ({ slug: m.slug, impliesSlug: m.impliesSlug }));

  if (custom) {
    const rows = await prisma.userModuleAccess.findMany({
      where: { userId, canAccess: true },
      include: { module: true },
    });
    return expandImplications(
      rows.map((r) => r.module.slug),
      implications,
    )
      .filter((s) => all.includes(s))
      .sort();
  }

  const matrixRole = moduleMatrixRoleSlug(role);
  const rows = await prisma.moduleRole.findMany({
    where: { role: matrixRole, canAccess: true },
    include: { module: true },
  });
  let slugs = expandImplications(
    rows.map((r) => r.module.slug),
    implications,
  );
  if (isFootballManagementRole(role)) {
    const football = catalog
      .filter((m) => isFootballOperationalModuleSlug(m.slug, m.functionalArea))
      .map((m) => m.slug);
    slugs = expandImplications([...new Set([...slugs, ...football])], implications);
  }
  return slugs.filter((s) => all.includes(s)).sort();
}

async function ensurePlatformFunctionForRole(role: string) {
  const legacy = moduleMatrixRoleSlug(role);
  let fn = await prisma.jobRole.findFirst({
    where: { scope: 'platform', platformLegacyRole: legacy },
  });
  if (fn) return fn;

  const label =
    legacy === 'user'
      ? 'USUÁRIO BÁSICO'
      : `Perfil legado (${legacy})`;

  fn = await prisma.jobRole.create({
    data: {
      ...(legacy === 'user' ? { id: 'cup360_fn_user_basic' } : {}),
      tenantId: null,
      scope: 'platform',
      type: 'staff',
      forFootball: false,
      isActive: true,
      name: label,
      code: legacy.toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 32) || 'LEGACY',
      platformLegacyRole: legacy,
      platformFamily: legacy === 'user' ? 'sistema' : 'legado',
      description:
        legacy === 'user'
          ? 'Perfil legado sem defaults de matriz — acesso via exceções.'
          : `Função criada automaticamente para role legado "${legacy}".`,
    },
  });
  console.log(`Criada função plataforma para role ${legacy}: ${fn.name}`);
  return fn;
}

async function backfillPlatformFunctionDefaults(): Promise<void> {
  const platformFns = await prisma.jobRole.findMany({
    where: { scope: 'platform', platformLegacyRole: { not: null } },
  });
  const catalog = await prisma.module.findMany({
    select: { id: true, slug: true, impliesSlug: true, functionalArea: true },
  });
  const implications = catalog.map((m) => ({ slug: m.slug, impliesSlug: m.impliesSlug }));

  for (const fn of platformFns) {
    const role = fn.platformLegacyRole!;
    let slugs = await legacyEffectiveSlugs('__none__', role, false);
    if (role === fn.platformLegacyRole) {
      // legacyEffectiveSlugs for non-custom uses matrix+football — OK for backfill
    }
    const slugSet = new Set(slugs);
    for (const mod of catalog) {
      if (!slugSet.has(mod.slug)) continue;
      await prisma.jobRoleModuleDefault.upsert({
        where: { jobRoleId_moduleId: { jobRoleId: fn.id, moduleId: mod.id } },
        create: { jobRoleId: fn.id, moduleId: mod.id },
        update: {},
      });
    }
    console.log(`Backfill função ${fn.name} (${role}): ${slugSet.size} módulos`);
  }
}

async function newEffectiveSlugs(userId: string, role: string): Promise<string[]> {
  const catalog = await prisma.module.findMany({ select: { slug: true, impliesSlug: true } });
  const allModuleSlugs = catalog.map((m) => m.slug);
  const implications = catalog.map((m) => ({ slug: m.slug, impliesSlug: m.impliesSlug }));

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      moduleOverrides: { include: { module: true } },
      platformFunction: true,
    },
  });
  if (!user) return [];

  let functionId = user.platformFunctionId;
  if (!functionId && user.platformFunction) functionId = user.platformFunction.id;
  if (!functionId) {
    const legacy = moduleMatrixRoleSlug(role);
    const fn = await prisma.jobRole.findFirst({
      where: { scope: 'platform', platformLegacyRole: legacy },
    });
    functionId = fn?.id ?? null;
  }

  let baseSlugs: string[] = [];
  if (functionId) {
    const defs = await prisma.jobRoleModuleDefault.findMany({
      where: { jobRoleId: functionId },
      include: { module: true },
    });
    baseSlugs = defs.map((d) => d.module.slug);
  }

  const overrides = user.moduleOverrides.map((o) => ({
    slug: o.module.slug,
    effect: o.effect as 'allow' | 'deny',
  }));

  return resolveEffectiveModuleSlugs({
    role,
    allModuleSlugs,
    implications,
    baseSlugs,
    overrides,
  });
}

async function convertCustomUser(userId: string, role: string): Promise<void> {
  const before = await legacyEffectiveSlugs(userId, role, true);
  const beforeSet = new Set(before);
  const fn = await ensurePlatformFunctionForRole(role);

  const catalog = await prisma.module.findMany({
    select: { id: true, slug: true, impliesSlug: true },
  });
  const allSlugs = catalog.map((m) => m.slug);
  const implications = catalog.map((m) => ({ slug: m.slug, impliesSlug: m.impliesSlug }));

  const baseRows = await prisma.jobRoleModuleDefault.findMany({
    where: { jobRoleId: fn.id },
    include: { module: true },
  });
  const baseExpanded = new Set(
    expandImplications(
      baseRows.map((r) => r.module.slug),
      implications,
    ).filter((s) => allSlugs.includes(s)),
  );

  const overrides: Array<{ moduleId: string; effect: 'allow' | 'deny' }> = [];
  for (const mod of catalog) {
    const inBefore = beforeSet.has(mod.slug);
    const inBase = baseExpanded.has(mod.slug);
    if (!inBefore && inBase) overrides.push({ moduleId: mod.id, effect: 'deny' });
  }
  for (const mod of catalog) {
    if (beforeSet.has(mod.slug)) {
      overrides.push({ moduleId: mod.id, effect: 'allow' });
    }
  }

  await prisma.userModuleOverride.deleteMany({ where: { userId } });
  for (const o of overrides) {
    await prisma.userModuleOverride.create({
      data: { userId, moduleId: o.moduleId, effect: o.effect },
    });
  }

  await prisma.userModuleAccess.deleteMany({ where: { userId } });
  await prisma.user.update({
    where: { id: userId },
    data: {
      platformFunctionId: fn.id,
      customModuleAccess: false,
    },
  });

  const after = await newEffectiveSlugs(userId, role);
  if (!setsEqual(before, after)) {
    const missing = before.filter((s) => !after.includes(s));
    const extra = after.filter((s) => !before.includes(s));
    throw new Error(
      `Usuário ${userId}: divergência pós-conversão. Perdidos: ${missing.slice(0, 8).join(', ')} Extra: ${extra.slice(0, 8).join(', ')}`,
    );
  }
}

async function main() {
  console.log('=== Backfill defaults das funções plataforma ===');
  await backfillPlatformFunctionDefaults();

  const customUsers = await prisma.user.findMany({
    where: { customModuleAccess: true, role: { not: 'super_admin' } },
    select: { id: true, email: true, role: true },
  });
  console.log(`=== Converter ${customUsers.length} usuários personalizados ===`);
  const convertedBefore = new Map<string, string[]>();
  for (const u of customUsers) {
    const role = u.role ?? 'editor';
    convertedBefore.set(u.id, await legacyEffectiveSlugs(u.id, role, true));
    console.log(`Convertendo ${u.email} (${role})…`);
    await convertCustomUser(u.id, role);
  }

  for (const u of customUsers) {
    const role = u.role ?? 'editor';
    const before = convertedBefore.get(u.id) ?? [];
    const after = await newEffectiveSlugs(u.id, role);
    if (!setsEqual(before, after)) {
      console.error(`FALHA equivalência pós-conversão: ${u.email}`);
      process.exit(1);
    }
  }

  console.log(`=== Pipeline OK (${customUsers.length} usuário(s) personalizado(s)) ===`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
