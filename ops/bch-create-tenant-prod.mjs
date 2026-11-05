/**
 * Produção: cria SOMENTE Tenant Boston City Hall se ausente.
 * kindId = primeiro match do seed (LOCAL DE EVENTOS → EVENTOS → …)
 */
import { PrismaClient } from '@prisma/client';

const TENANT_SLUG = 'boston-city-hall';
const TENANT_NAME = 'Boston City Hall';
const KIND_NAMES = ['LOCAL DE EVENTOS', 'EVENTOS', 'RESTAURANTE', 'CONSTRUTORA'];

const prisma = new PrismaClient();

async function resolveKindId() {
  for (const name of KIND_NAMES) {
    const kind = await prisma.tenantKind.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (kind) return kind;
  }
  throw new Error('Nenhum TenantKind canônico encontrado para BCH.');
}

const existing = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
if (existing) {
  console.log(JSON.stringify({ action: 'skip', tenant: { id: existing.id, slug: existing.slug, name: existing.name } }));
  await prisma.$disconnect();
  process.exit(0);
}

const kind = await resolveKindId();
const tenant = await prisma.tenant.create({
  data: {
    name: TENANT_NAME,
    slug: TENANT_SLUG,
    kindId: kind.id,
    location: 'Boston, MA',
    city: 'Boston',
    country: 'EUA',
    websiteUrl: 'https://www.bostoncitygroup.biz/portfolio/boston-city-hall',
  },
  select: { id: true, name: true, slug: true, kindId: true },
});
console.log(JSON.stringify({ action: 'created', tenant, kindUsed: { id: kind.id, name: kind.name } }));
await prisma.$disconnect();
