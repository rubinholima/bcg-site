/**
 * Corrige acentuação corrompida em Group.homeContent e Page.content.
 * Usado quando dados foram migrados com encoding errado (ex.: Docker → PM2).
 *
 * O mojibake típico: UTF-8 foi interpretado como Latin-1 ao salvar.
 * Fix: Buffer.from(str, 'latin1').toString('utf8')
 *
 * Rodar: pnpm --filter api exec ts-node -r tsconfig-paths/register scripts/fix-encoding.ts
 * Requer: DATABASE_URL em .env
 */

import * as path from 'path';
import * as dotenv from 'dotenv';

const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env') });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(cwd, '../../.env') });
}

const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');
const prisma = new PrismaClient();

/** Corrige string com mojibake (UTF-8 lido como Latin-1). */
function fixString(str: string): string {
  if (typeof str !== 'string' || str.length === 0) return str;
  try {
    const fixed = Buffer.from(str, 'latin1').toString('utf8');
    return fixed;
  } catch {
    return str;
  }
}

/** Aplica fix recursivamente em objetos/arrays. */
function fixJson(obj: unknown): unknown {
  if (typeof obj === 'string') return fixString(obj);
  if (Array.isArray(obj)) return obj.map(fixJson);
  if (obj !== null && typeof obj === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = fixJson(v);
    }
    return out;
  }
  return obj;
}

async function main() {
  console.log('Corrigindo encoding em Group.homeContent e Page.content...\n');

  const groups = await prisma.group.findMany({ where: { homeContent: { not: null } } });
  for (const g of groups) {
    if (g.homeContent) {
      const fixed = fixJson(g.homeContent) as object;
      await prisma.group.update({
        where: { id: g.id },
        data: { homeContent: fixed },
      });
      console.log(`  Group ${g.slug}: homeContent corrigido`);
    }
  }

  const pages = await prisma.page.findMany({ where: { content: { not: null } } });
  for (const p of pages) {
    if (p.content) {
      const fixed = fixJson(p.content) as object;
      await prisma.page.update({
        where: { id: p.id },
        data: { content: fixed },
      });
      console.log(`  Page ${p.tenantId}/${p.slug}: content corrigido`);
    }
  }

  const homeContents = await prisma.homeContent.findMany();
  for (const h of homeContents) {
    if (h.content) {
      const fixed = fixJson(h.content) as object;
      await prisma.homeContent.update({
        where: { id: h.id },
        data: { content: fixed },
      });
      console.log(`  HomeContent ${h.slug}: content corrigido`);
    }
  }

  console.log('\nConcluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
