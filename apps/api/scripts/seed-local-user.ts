/**
 * Seed: usuário principal para login próprio (email/senha).
 * Cria ou atualiza rl@bostoncitygroup.biz com senha 2504 (trocar depois no CRUD de usuários).
 *
 * Rodar (monorepo):
 *   pnpm --filter api run seed:local-user
 *
 * Requer: DATABASE_URL em .env. Rode após a migration add_user_password_and_role.
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcryptjs';

const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env') });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(cwd, '../../.env') });
}

const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');
const prisma = new PrismaClient();

const EMAIL = 'rl@bostoncitygroup.biz';
const INITIAL_PASSWORD = '2504';
const ROLE = 'super_admin';
const SALT_ROUNDS = 10;

async function main() {
  const passwordHash = await bcrypt.hash(INITIAL_PASSWORD, SALT_ROUNDS);
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    create: {
      email: EMAIL,
      name: 'Boston City Group',
      passwordHash,
      role: ROLE,
    },
    update: {
      passwordHash,
      role: ROLE,
      updatedAt: new Date(),
    },
  });
  console.log('Local user seeded:', user.email, '| role:', user.role, '| id:', user.id);
  console.log('Login com senha inicial 2504 — altere no dashboard (Usuários) após o primeiro acesso.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
