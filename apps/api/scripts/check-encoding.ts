/**
 * Verifica o que está armazenado no banco (Group + Page).
 * Rodar: pnpm exec ts-node -r tsconfig-paths/register scripts/check-encoding.ts
 *
 * Também mostra query SQL para rodar no psql e ver bytes brutos.
 */

import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
}

const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== 1. Via Prisma (Group homeContent) ===\n');
  const group = await prisma.group.findFirst({ where: { slug: 'bcg' } });
  if (!group?.homeContent) {
    console.log('Group bcg não encontrado ou sem homeContent');
  } else {
    const blocks = (group.homeContent as { blocks?: unknown[] })?.blocks ?? [];
    const whatBlock = blocks.find((b: { type?: string }) => b.type === 'what') as { config?: Record<string, unknown> } | undefined;
    if (whatBlock?.config) {
      const cfg = whatBlock.config;
      const titlePt = String(cfg.titlePt ?? '');
      console.log('titlePt (Prisma):', JSON.stringify(titlePt));
      console.log('hex (Unicode):', [...titlePt].map((c) => c.charCodeAt(0).toString(16)).join(' '));
      console.log('');
    }
  }

  console.log('=== 2. Via Prisma (Page content - primeira página) ===\n');
  const page = await prisma.page.findFirst({ where: { content: { not: null } } });
  if (!page?.content) {
    console.log('Nenhuma Page com content');
  } else {
    const blocks = (page.content as { blocks?: unknown[] })?.blocks ?? [];
    const whatBlock = blocks.find((b: { type?: string }) => b.type === 'what') as { config?: Record<string, unknown> } | undefined;
    if (whatBlock?.config) {
      const cfg = whatBlock.config;
      const titlePt = String(cfg.titlePt ?? '');
      console.log('Page', page.tenantId, page.slug, '- titlePt:', JSON.stringify(titlePt));
      console.log('hex:', [...titlePt].map((c) => c.charCodeAt(0).toString(16)).join(' '));
      console.log('');
    }
  }

  console.log('=== 3. Direto no PostgreSQL ===\n');
  const enc = await prisma.$queryRawUnsafe<[{ pg_encoding_to_char: string }]>(
    "SELECT pg_encoding_to_char(encoding) as pg_encoding_to_char FROM pg_database WHERE datname = current_database()"
  );
  console.log('Encoding do banco:', enc[0]?.pg_encoding_to_char ?? '?');

  const raw = await prisma.$queryRawUnsafe<[{ title_pt: string | null }][]>(
    `SELECT (b.elem->'config'->>'titlePt') as title_pt FROM "Group" g, jsonb_array_elements(g.home_content->'blocks') as b(elem) WHERE g.slug = 'bcg' AND b.elem->>'type' = 'what' LIMIT 1`
  );
  const titleFromDb = raw[0]?.title_pt ?? null;
  if (titleFromDb) {
    console.log('titlePt (SQL raw):', JSON.stringify(titleFromDb));
    const hex = Buffer.from(titleFromDb, 'utf8').toString('hex');
    console.log('bytes hex (UTF-8):', hex.match(/.{1,2}/g)?.join(' ') ?? hex);
  }
  console.log('\nReferência: UTF-8 ó=c3b3 ã=c3a3 | Latin-1 ó=f3 ã=e3');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
