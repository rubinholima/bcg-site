/**
 * Seed: tenant Boston City Hall + página pública (Construção Web).
 * Idempotente: rodar 2x não duplica tenant nem página; atualiza conteúdo se já existir.
 *
 * Rodar (monorepo, a partir da raiz):
 *   pnpm --filter api run seed:boston-city-hall
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { buildBostonCityHallPageContent } from '../src/pages/boston-city-hall-page-default';
import { DEFAULT_VENUE_SPACES } from '../src/boston-city-hall/boston-city-hall.constants';

const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env') });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(cwd, '../../.env') });
}

const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');
const prisma = new PrismaClient();

const TENANT_SLUG = 'boston-city-hall';
const TENANT_NAME = 'Boston City Hall';
const PAGE_SLUG = 'main';
const KIND_NAMES = ['LOCAL DE EVENTOS', 'EVENTOS', 'RESTAURANTE', 'CONSTRUTORA'];

function resolveLogoFilePath(): string | null {
  const candidates = [
    path.resolve(cwd, '../../apps/web/public/boston-city-hall-logo.png'),
    path.resolve(cwd, '../../apps/web/public/logos/boston-city-hall.png'),
    path.resolve(cwd, '../web/public/boston-city-hall-logo.png'),
    path.resolve(cwd, '../web/public/logos/boston-city-hall.png'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function uploadTenantLogo(
  tenantId: string,
  filePath: string,
): Promise<string | null> {
  const bucket = (process.env.AWS_S3_BUCKET ?? '').trim();
  const region = (process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? 'us-east-1').trim();
  if (!bucket) {
    console.warn('AWS_S3_BUCKET não definido — logoUrl não enviado ao S3.');
    return null;
  }
  const buffer = fs.readFileSync(filePath);
  const key = `logos/tenants/${tenantId}/logo.png`;
  const client = new S3Client({ region });
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: 'image/png',
    }),
  );
  console.log(`Logo enviado ao S3: ${key}`);
  return key;
}

async function resolveKindId(): Promise<string> {
  for (const name of KIND_NAMES) {
    const kind = await prisma.tenantKind.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (kind) return kind.id;
  }
  const created = await prisma.tenantKind.create({
    data: { name: 'LOCAL DE EVENTOS' },
  });
  return created.id;
}

async function main() {
  const kindId = await resolveKindId();
  const content = buildBostonCityHallPageContent();

  let tenant = await prisma.tenant.findUnique({
    where: { slug: TENANT_SLUG },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: TENANT_NAME,
        slug: TENANT_SLUG,
        kindId,
        location: 'Boston, MA',
        city: 'Boston',
        country: 'EUA',
        websiteUrl: 'https://www.bostoncitygroup.biz/portfolio/boston-city-hall',
      },
    });
    console.log(`Tenant criado: ${tenant.name} (${tenant.slug})`);
  } else {
    tenant = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        name: TENANT_NAME,
        websiteUrl: tenant.websiteUrl ?? 'https://www.bostoncitygroup.biz/portfolio/boston-city-hall',
      },
    });
    console.log(`Tenant já existia: ${tenant.name} (${tenant.slug})`);
  }

  const logoPath = resolveLogoFilePath();
  if (logoPath) {
    try {
      const logoKey = await uploadTenantLogo(tenant.id, logoPath);
      if (logoKey) {
        tenant = await prisma.tenant.update({
          where: { id: tenant.id },
          data: { logoUrl: logoKey },
        });
      }
    } catch (err) {
      console.warn('Falha ao enviar logo (tenant segue sem logoUrl no S3):', err);
    }
  } else {
    console.warn('Arquivo boston-city-hall-logo.png não encontrado em apps/web/public/.');
  }

  const existingPage = await prisma.page.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug: PAGE_SLUG } },
  });

  if (!existingPage) {
    await prisma.page.create({
      data: {
        tenantId: tenant.id,
        slug: PAGE_SLUG,
        title: TENANT_NAME,
        content: content as object,
      },
    });
    console.log(`Página criada: /portfolio/${TENANT_SLUG}`);
  } else {
    await prisma.page.update({
      where: { id: existingPage.id },
      data: {
        title: TENANT_NAME,
        content: content as object,
      },
    });
    console.log(`Página atualizada: /portfolio/${TENANT_SLUG}`);
  }

  for (const s of DEFAULT_VENUE_SPACES) {
    await prisma.venueSpace.upsert({
      where: { venueSlug_slug: { venueSlug: TENANT_SLUG, slug: s.slug } },
      create: {
        venueSlug: TENANT_SLUG,
        name: s.name,
        slug: s.slug,
        capacityStanding: s.capacityStanding ?? null,
        capacitySeated: s.capacitySeated ?? null,
        sortOrder: s.sortOrder,
      },
      update: {
        name: s.name,
        capacityStanding: s.capacityStanding ?? null,
        capacitySeated: s.capacitySeated ?? null,
        sortOrder: s.sortOrder,
      },
    });
  }
  console.log('Espaços do venue garantidos no banco.');

  console.log('\nPróximos passos:');
  console.log(`  • Editar: Dashboard → Páginas → ${TENANT_NAME}`);
  console.log(`  • Preview: /portfolio/${TENANT_SLUG}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
