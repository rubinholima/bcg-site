/**
 * One-off: confirma se os dados do fundador e do hero estão no banco (Group.homeContent).
 * Uso: pnpm --filter api exec ts-node -r tsconfig-paths/register scripts/check-group-home-blocks.ts
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

async function main() {
  const group = await prisma.group.findUnique({ where: { slug: 'bcg' } });
  if (!group) {
    console.log('Group bcg não encontrado.');
    return;
  }

  const content = group.homeContent as { blocks?: Array<{ id: string; type: string; config?: Record<string, unknown> }> } | null;
  const blocks = Array.isArray(content?.blocks) ? content.blocks : [];

  const hero = blocks.find((b) => b.type === 'hero');
  const founder = blocks.find((b) => b.type === 'founder');

  console.log('--- Hero ---');
  if (hero?.config) {
    console.log('heroSlides:', JSON.stringify(hero.config.heroSlides, null, 2));
    console.log('titlePt:', hero.config.titlePt);
    console.log('(outras chaves):', Object.keys(hero.config).join(', '));
  } else {
    console.log('Bloco hero não encontrado ou sem config.');
  }

  console.log('\n--- Founder ---');
  if (founder?.config) {
    console.log('Chaves no config:', Object.keys(founder.config).join(', '));
    console.log('founderPhoto / imageUrl:', founder.config.founderPhoto ?? founder.config.imageUrl);
    console.log('rolePT:', founder.config.rolePT);
    console.log('biographyPT / bodyPt:', (founder.config.biographyPT ?? founder.config.bodyPt) ? '(presente)' : '(vazio)');
    console.log('highlightQuotePT / quotePt:', founder.config.highlightQuotePT ?? founder.config.quotePt);
  } else {
    console.log('Bloco founder não encontrado ou sem config.');
  }

  console.log('\nTotal de blocos:', blocks.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
