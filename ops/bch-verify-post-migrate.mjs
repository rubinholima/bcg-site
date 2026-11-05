import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const bch = await prisma.tenant.findUnique({
  where: { slug: 'boston-city-hall' },
  select: { id: true, name: true, slug: true, kindId: true },
});

const spaces = await prisma.$queryRaw`
  SELECT id, "venueSlug", "tenantId" FROM "VenueSpace" ORDER BY id`;

const spaceOwnership = {
  total: spaces.length,
  withTenant: spaces.filter((s) => s.tenantId).length,
  allBchSlug: spaces.every((s) => s.venueSlug === 'boston-city-hall'),
  allMatchBchTenant: bch ? spaces.every((s) => s.tenantId === bch.id) : false,
};

const bookings = await prisma.venueBooking.count();
const leads = await prisma.venuePipelineLead.count();

const fks = await prisma.$queryRaw`
  SELECT conname, conrelid::regclass::text AS table_name
  FROM pg_constraint
  WHERE conname IN (
    'VenueSpace_tenantId_fkey',
    'VenueBooking_tenantId_fkey',
    'VenuePipelineLead_tenantId_fkey'
  )
  ORDER BY conname`;

const indexes = await prisma.$queryRaw`
  SELECT indexname, tablename
  FROM pg_indexes
  WHERE indexname IN (
    'VenueSpace_tenantId_idx',
    'VenueBooking_tenantId_idx',
    'VenuePipelineLead_tenantId_idx'
  )
  ORDER BY indexname`;

const mig = await prisma.$queryRaw`
  SELECT migration_name, finished_at, rolled_back_at, logs
  FROM "_prisma_migrations"
  WHERE migration_name = '20261007143000_bch_venue_tenant_ownership'
  ORDER BY started_at DESC LIMIT 1`;

const pending = await prisma.$queryRaw`
  SELECT COUNT(*)::int AS cnt
  FROM "_prisma_migrations"
  WHERE finished_at IS NULL AND rolled_back_at IS NULL`;

console.log(
  JSON.stringify(
    {
      bch,
      spaceOwnership,
      bookings,
      leads,
      fks,
      indexes,
      bchMigration: mig,
      unresolvedFailedMigrations: pending,
    },
    null,
    2,
  ),
);

await prisma.$disconnect();
