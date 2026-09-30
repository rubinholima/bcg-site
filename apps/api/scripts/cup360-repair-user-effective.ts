/**
 * Repara acesso efetivo de um usuário a partir de lista BEFORE (snapshot pré-conversão).
 * Uso: ts-node scripts/cup360-repair-user-effective.ts <userId> <caminho-json-before>
 */
import * as fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { expandImplications, resolveEffectiveModuleSlugs } from '../src/modules/effective-access.util';

const prisma = new PrismaClient();

function setsEqual(a: string[], b: string[]): boolean {
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size !== sb.size) return false;
  for (const x of sa) if (!sb.has(x)) return false;
  return true;
}

async function main() {
  const userId = process.argv[2];
  const beforeFile = process.argv[3];
  if (!userId || !beforeFile) {
    console.error('Uso: cup360-repair-user-effective.ts <userId> <before.json>');
    process.exit(1);
  }
  const snap = JSON.parse(fs.readFileSync(beforeFile, 'utf8')) as {
    users: Array<{ id: string; legacyEffectiveSlugs: string[]; role: string }>;
  };
  const row = snap.users.find((u) => u.id === userId);
  if (!row) {
    console.error('Usuário não encontrado no snapshot');
    process.exit(1);
  }
  const before = [...row.legacyEffectiveSlugs].sort();
  const beforeSet = new Set(before);
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { platformFunction: true },
  });
  if (!user?.platformFunctionId) {
    console.error('Usuário sem platformFunctionId');
    process.exit(1);
  }

  const catalog = await prisma.module.findMany({
    select: { id: true, slug: true, impliesSlug: true },
  });
  const allSlugs = catalog.map((m) => m.slug);
  const implications = catalog.map((m) => ({ slug: m.slug, impliesSlug: m.impliesSlug }));

  const baseRows = await prisma.jobRoleModuleDefault.findMany({
    where: { jobRoleId: user.platformFunctionId },
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
    if (!beforeSet.has(mod.slug) && baseExpanded.has(mod.slug)) {
      overrides.push({ moduleId: mod.id, effect: 'deny' });
    }
  }
  for (const mod of catalog) {
    if (beforeSet.has(mod.slug)) overrides.push({ moduleId: mod.id, effect: 'allow' });
  }

  await prisma.userModuleOverride.deleteMany({ where: { userId } });
  for (const o of overrides) {
    await prisma.userModuleOverride.create({ data: { userId, moduleId: o.moduleId, effect: o.effect } });
  }
  await prisma.user.update({
    where: { id: userId },
    data: { customModuleAccess: false },
  });

  const defs = baseRows.map((r) => r.module.slug);
  const ovr = overrides.map((o) => {
    const mod = catalog.find((m) => m.id === o.moduleId)!;
    return { slug: mod.slug, effect: o.effect };
  });
  const after = resolveEffectiveModuleSlugs({
    role: user.role ?? 'editor',
    allModuleSlugs: allSlugs,
    implications,
    baseSlugs: defs,
    overrides: ovr,
  });

  if (!setsEqual(before, after)) {
    const missing = before.filter((s) => !after.includes(s));
    const extra = after.filter((s) => !before.includes(s));
    console.error('Falha reparo', { missing: missing.slice(0, 10), extra: extra.slice(0, 10) });
    process.exit(1);
  }
  console.log(`OK ${user.email} — ${after.length} slugs efetivos`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
