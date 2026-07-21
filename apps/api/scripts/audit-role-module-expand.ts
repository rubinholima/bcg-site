import * as path from 'path';
import * as dotenv from 'dotenv';
const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env') });
const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');
const prisma = new PrismaClient();

async function expand(slugs: string[]) {
  const out = new Set(slugs);
  const mods = await prisma.module.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, impliesSlug: true },
  });
  for (const m of mods) if (m.impliesSlug) out.add(m.impliesSlug);
  return [...out];
}

async function main() {
  const role = process.argv[2] ?? 'compras';
  const rows = await prisma.moduleRole.findMany({
    where: { role, canAccess: true },
    include: { module: { select: { slug: true, impliesSlug: true, name: true } } },
  });
  const raw = rows.map((r) => r.module.slug);
  const expanded = await expand(raw);
  console.log('Role:', role);
  console.log('\nDirect grants:', raw.length);
  for (const s of raw.sort()) console.log(' ', s, rows.find((r) => r.module.slug === s)?.module.impliesSlug ? `→ ${rows.find((r) => r.module.slug === s)?.module.impliesSlug}` : '');
  console.log('\nAfter impliesSlug expand:', expanded.length);
  const leaked = expanded.filter((s) => !raw.includes(s));
  console.log('Implied (extra):', leaked.join(', ') || '(none)');
  console.log('\nSensitive expanded:');
  for (const s of expanded) {
    if (/financeiro|relatorios[^_]|relatorios_futebol|relatorios_saude|relatorios_marketing|adm_rh|adm_patrimonio/.test(s)) {
      console.log(' ', s);
    }
  }
}

main().finally(() => prisma.$disconnect());
