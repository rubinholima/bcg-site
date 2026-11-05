/* read-only production preflight — DATABASE_URL must be in env */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const kindNames = ['LOCAL DE EVENTOS', 'EVENTOS', 'RESTAURANTE', 'CONSTRUTORA'];
  const kinds = await prisma.tenantKind.findMany({
    where: { OR: kindNames.map((name) => ({ name: { equals: name, mode: 'insensitive' } })) },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  });
  const bch = await prisma.tenant.findUnique({
    where: { slug: 'boston-city-hall' },
    select: { id: true, name: true, slug: true, kindId: true },
  });
  const fc = await prisma.tenant.findUnique({
    where: { slug: 'boston-city-fc-brasil' },
    select: { id: true, slug: true },
  });
  const vsTotal = await prisma.venueSpace.count();
  const vsBch = await prisma.venueSpace.count({ where: { venueSlug: 'boston-city-hall' } });
  const bookings = await prisma.venueBooking.count();
  const leads = await prisma.venuePipelineLead.count();
  const failed = await prisma.$queryRaw`
    SELECT migration_name, finished_at, rolled_back_at
    FROM "_prisma_migrations"
    WHERE migration_name = '20261007143000_bch_venue_tenant_ownership'
    ORDER BY started_at DESC LIMIT 3`;
  console.log(JSON.stringify({ kinds, bch, fc, vsTotal, vsBch, bookings, leads, failed }, null, 2));
}

main()
  .catch((e) => {
    console.error(String(e.message || e));
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
