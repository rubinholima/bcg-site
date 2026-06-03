import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { FootballAgendaBirthdaysService } from '../src/futebol-agenda/football-agenda-birthdays.service';

async function main() {
  const prisma = new PrismaClient();
  const service = new FootballAgendaBirthdaysService(prisma);
  const slug = process.argv[2] ?? 'boston-city-fc-brasil';
  const tenant = await prisma.tenant.findFirst({ where: { slug } });
  if (!tenant) throw new Error(`Tenant não encontrado: ${slug}`);
  const result = await service.syncTenantBirthdays(tenant.id);
  console.log(JSON.stringify(result, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
