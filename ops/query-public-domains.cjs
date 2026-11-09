const { PrismaClient } = require('@prisma/client');
const hosts = process.argv.slice(2);
const prisma = new PrismaClient();
prisma.publicDomain
  .findMany({
    where: hosts.length ? { hostnameNormalized: { in: hosts } } : undefined,
    select: {
      id: true,
      hostnameNormalized: true,
      status: true,
      provisioningStatus: true,
      isCanonical: true,
      tenantId: true,
    },
    take: 20,
  })
  .then((rows) => console.log(JSON.stringify(rows, null, 2)))
  .finally(() => prisma.$disconnect());
