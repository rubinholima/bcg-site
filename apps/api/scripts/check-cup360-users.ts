import * as path from 'path';
import * as dotenv from 'dotenv';
const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env') });
const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.platformRole.findMany({
    where: { canAccessDashboard: true, isActive: true },
    select: { slug: true },
  });
  console.log('Dashboard roles in DB:', roles.map((r) => r.slug).join(', '));

  const cup360 = await prisma.user.findMany({
    where: {
      role: {
        in: [
          'supervisor',
          'treinador',
          'preparador',
          'roupeiro',
          'compras',
          'rh',
          'financeiro',
          'ceo',
          'marketing',
        ],
      },
    },
    select: { username: true, role: true, mustChangePassword: true, email: true },
    orderBy: { username: 'asc' },
  });
  console.log('\nUsuários Cup360 (novos roles):');
  for (const u of cup360) {
    const flag = u.mustChangePassword ? ' [TROCAR SENHA]' : '';
    console.log(`  ${u.username} (${u.role})${flag}`);
  }

  const fernanda = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: 'fernanda', mode: 'insensitive' } },
        { name: { contains: 'FERnanda', mode: 'insensitive' } },
        { email: { contains: 'fernanda', mode: 'insensitive' } },
      ],
    },
    select: { username: true, email: true, role: true, mustChangePassword: true, passwordHash: true },
  });
  console.log('\nUsuários fernanda*:');
  console.log(JSON.stringify(fernanda.map((u) => ({ ...u, hasPassword: !!u.passwordHash, passwordHash: undefined })), null, 2));
}

main().finally(() => prisma.$disconnect());
