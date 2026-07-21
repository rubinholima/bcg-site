import * as path from 'path';
import * as dotenv from 'dotenv';

const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env') });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(cwd, '../../.env') });
}

const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');
const prisma = new PrismaClient();

const TARGET = process.argv[2] ?? 'fernandabaia';

async function main() {
  const dashboardRoles = await prisma.platformRole.findMany({
    where: { canAccessDashboard: true, isActive: true },
    select: { slug: true, label: true },
  });
  const dashboardSlugs = new Set(dashboardRoles.map((r) => r.slug));

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: { equals: TARGET, mode: 'insensitive' } },
        { email: { equals: TARGET, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      mustChangePassword: true,
      customModuleAccess: true,
      cognitoSub: true,
    },
  });

  console.log('=== USUÁRIO ALVO ===');
  console.log(JSON.stringify(user, null, 2));

  if (user?.role) {
    const roleSlug = user.role;
    const roleRow = await prisma.platformRole.findUnique({ where: { slug: roleSlug } });
    console.log('\n=== PERFIL (PlatformRole) ===');
    console.log(JSON.stringify(roleRow, null, 2));

    const granted = await prisma.moduleRole.count({
      where: { role: roleSlug, canAccess: true },
    });
    console.log('\nMódulos com acesso (role):', granted);

    const tenants = await prisma.userTenant.findMany({
      where: { userId: user.id },
      include: { tenant: { select: { name: true } } },
    });
    console.log('\nTenants:', tenants.map((t) => t.tenant.name).join(', ') || '(nenhum — vê todos)');

    const issues: string[] = [];
    if (user.mustChangePassword) issues.push('mustChangePassword=true → redireciona para /change-password');
    if (!dashboardSlugs.has(roleSlug) && roleSlug !== 'super_admin') {
      issues.push(`role "${roleSlug}" sem canAccessDashboard → redireciona para / (página pública)`);
    }
    if (!roleRow) issues.push(`role "${roleSlug}" não existe em PlatformRole`);
    if (roleRow && !roleRow.isActive) issues.push('perfil inativo');
    if (!user.role) issues.push('role null no usuário');

    console.log('\n=== DIAGNÓSTICO ===');
    if (issues.length) console.log(issues.join('\n'));
    else console.log('Nenhum bloqueio óbvio — verificar sessão/login.');
  }

  console.log('\n=== OUTROS USUÁRIOS COM MESMO PROBLEMA (role sem dashboard) ===');
  const allUsers = await prisma.user.findMany({
    select: { username: true, email: true, role: true, mustChangePassword: true },
    orderBy: { username: 'asc' },
  });

  const blocked = allUsers.filter((u) => u.role && !dashboardSlugs.has(u.role) && u.role !== 'super_admin');
  console.log(`Total: ${blocked.length}`);
  for (const u of blocked) {
    console.log(`  ${u.username} | role=${u.role} | mustChange=${u.mustChangePassword}`);
  }

  console.log('\n=== mustChangePassword=true (ativos) ===');
  const mustChange = allUsers.filter((u) => u.mustChangePassword);
  console.log(`Total: ${mustChange.length}`);
  for (const u of mustChange.slice(0, 30)) {
    console.log(`  ${u.username} | role=${u.role}`);
  }
  if (mustChange.length > 30) console.log(`  ... +${mustChange.length - 30} mais`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
