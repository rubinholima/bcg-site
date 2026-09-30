/**
 * Snapshot SOMENTE LEITURA do estado de acesso (produção ou qualquer DATABASE_URL).
 * Uso: pnpm --filter api exec ts-node -r tsconfig-paths/register scripts/cup360-prod-access-snapshot.ts [--out arquivo.json]
 */
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import { moduleMatrixRoleSlug } from '../src/modules/module-matrix-role.util';
import {
  isFootballManagementRole,
  isFootballOperationalModuleSlug,
} from '../src/modules/football-domain-access.util';

function expandImplications(
  slugs: string[],
  implications: Array<{ slug: string; impliesSlug: string | null }>,
): string[] {
  const out = new Set(slugs);
  for (const s of slugs) {
    const row = implications.find((m) => m.slug === s);
    if (row?.impliesSlug) out.add(row.impliesSlug);
  }
  return [...out];
}

const prisma = new PrismaClient();

async function legacyEffectiveSlugs(
  userId: string,
  role: string,
  customModuleAccess: boolean,
): Promise<string[]> {
  if (role === 'super_admin') {
    const all = await prisma.module.findMany({ select: { slug: true } });
    return all.map((m) => m.slug).sort();
  }

  const catalog = await prisma.module.findMany({
    select: { slug: true, impliesSlug: true, functionalArea: true },
  });
  const allModuleSlugs = catalog.map((m) => m.slug);
  const implications = catalog.map((m) => ({ slug: m.slug, impliesSlug: m.impliesSlug }));

  if (customModuleAccess) {
    const rows = await prisma.userModuleAccess.findMany({
      where: { userId, canAccess: true },
      include: { module: true },
    });
    const raw = rows.map((r) => r.module.slug);
    return expandImplications(raw, implications).filter((s) => allModuleSlugs.includes(s)).sort();
  }

  const matrixRole = moduleMatrixRoleSlug(role);
  const rows = await prisma.moduleRole.findMany({
    where: { role: matrixRole, canAccess: true },
    include: { module: true },
  });
  let slugs = rows.map((r) => r.module.slug);
  slugs = expandImplications(slugs, implications);
  if (isFootballManagementRole(role)) {
    const football = catalog
      .filter((m) => isFootballOperationalModuleSlug(m.slug, m.functionalArea))
      .map((m) => m.slug);
    slugs = expandImplications([...new Set([...slugs, ...football])], implications);
  }
  return slugs.filter((s) => allModuleSlugs.includes(s)).sort();
}

async function main() {
  const outArg = process.argv.indexOf('--out');
  const outFile = outArg >= 0 ? process.argv[outArg + 1] : null;

  const modules = await prisma.module.findMany({
    orderBy: { sortOrder: 'asc' },
    select: { slug: true, name: true, functionalArea: true },
  });

  type SnapUser = {
    id: string;
    email: string;
    username: string;
    name: string | null;
    role: string | null;
    customModuleAccess: boolean;
    platformFunctionId?: string | null;
    userTenants: Array<{ tenantId: string; tenant: { name: string; slug: string } }>;
    moduleAccess: Array<{ canAccess: boolean; module: { slug: string } }>;
    moduleOverrides?: Array<{ effect: string; module: { slug: string } }>;
  };

  const users = (await prisma.user.findMany({
    include: {
      userTenants: { include: { tenant: { select: { name: true, slug: true } } } },
      moduleAccess: { include: { module: { select: { slug: true } } } },
    },
    orderBy: { email: 'asc' },
  })) as SnapUser[];

  const customCount = users.filter((u) => u.customModuleAccess).length;
  const moduleRoleRows = await prisma.moduleRole.count({ where: { canAccess: true } });

  const userReports: Array<Record<string, unknown>> = [];
  for (const u of users) {
    const role = u.role ?? 'editor';
    const legacySlugs = await legacyEffectiveSlugs(u.id, role, u.customModuleAccess);
    userReports.push({
      id: u.id,
      email: u.email,
      username: u.username,
      name: u.name,
      role,
      customModuleAccess: u.customModuleAccess,
      platformFunctionId: (u as { platformFunctionId?: string | null }).platformFunctionId ?? null,
      tenants: u.userTenants.map((t) => ({ id: t.tenantId, name: t.tenant.name, slug: t.tenant.slug })),
      legacyEffectiveSlugs: legacySlugs,
      legacyModuleCount: legacySlugs.length,
      customGrants: u.customModuleAccess
        ? u.moduleAccess.filter((a) => a.canAccess).map((a) => a.module.slug)
        : [],
      overrides:
        (u as { moduleOverrides?: Array<{ module: { slug: string }; effect: string }> }).moduleOverrides?.map(
          (o) => ({ slug: o.module.slug, effect: o.effect }),
        ) ?? [],
    });
  }

  const snapshot = {
    capturedAt: new Date().toISOString(),
    moduleCount: modules.length,
    userCount: users.length,
    customModuleAccessUsers: customCount,
    moduleRoleGrantRows: moduleRoleRows,
    modules: modules.map((m) => m.slug),
    users: userReports,
  };

  const json = JSON.stringify(snapshot, null, 2);
  if (outFile) {
    fs.writeFileSync(outFile, json, 'utf8');
    console.log('Snapshot gravado:', outFile);
  } else {
    console.log(json);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
