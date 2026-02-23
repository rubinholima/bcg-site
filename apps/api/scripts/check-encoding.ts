/**
 * Verifica o que está armazenado no banco (Group homeContent).
 * Rodar: pnpm exec ts-node -r tsconfig-paths/register scripts/check-encoding.ts
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
  const group = await prisma.group.findFirst({ where: { slug: 'bcg' } });
  if (!group?.homeContent) {
    console.log('Group bcg não encontrado ou sem homeContent');
    return;
  }
  const blocks = (group.homeContent as { blocks?: unknown[] })?.blocks ?? [];
  const whatBlock = blocks.find((b: { type?: string }) => b.type === 'what') as { config?: Record<string, unknown> } | undefined;
  if (!whatBlock?.config) {
    console.log('Bloco what não encontrado');
    return;
  }
  const cfg = whatBlock.config;
  console.log('--- titlePt (raw) ---');
  console.log(JSON.stringify(cfg.titlePt));
  console.log('--- titlePt (hex bytes) ---');
  const s = String(cfg.titlePt ?? '');
  console.log([...s].map((c) => c.charCodeAt(0).toString(16)).join(' '));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
