/**
 * Importa usuários das abas ADM e FUTEBOL da planilha Cup360 BCFC.
 *
 * Planilha: https://docs.google.com/spreadsheets/d/19slG84asLFQ376Ll7tH9tJst7aDpvjxEOjbVnz4tf4o
 *
 * Campos: NOME → name | USERNAME → username | EMAIL → email | ROLE → role (slug)
 *         CLUBE → tenant | SENHA INICIAL → password (mustChangePassword=true)
 *
 * Uso:
 *   cd apps/api
 *   pnpm import:cup360-users          # aplica
 *   pnpm import:cup360-users -- --dry-run
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

const SALT_ROUNDS = 10;
const DRY_RUN = process.argv.includes('--dry-run');
const SHEET_ID = '19slG84asLFQ376Ll7tH9tJst7aDpvjxEOjbVnz4tf4o';

type SheetRow = {
  name: string;
  username: string;
  email: string;
  cargo: string;
  club: string;
  role: string;
  password: string;
};

/** ROLE da planilha → slug do PlatformRole (existente ou novo). */
const ROLE_SLUG_MAP: Record<string, string> = {
  GERENTE: 'gerente',
  ANALISTA: 'analista',
  SUPERVISOR: 'supervisor',
  TREINADOR: 'treinador',
  PREPARADOR: 'preparador',
  ROUPEIRO: 'roupeiro',
  COMPRAS: 'compras',
  RH: 'rh',
  FINANCEIRO: 'financeiro',
  CEO: 'ceo',
  MARKETING: 'marketing',
};

const NEW_ROLES: { slug: string; label: string; sortOrder: number }[] = [
  { slug: 'supervisor', label: 'SUPERVISOR', sortOrder: 110 },
  { slug: 'treinador', label: 'TREINADOR', sortOrder: 120 },
  { slug: 'preparador', label: 'PREPARADOR', sortOrder: 130 },
  { slug: 'roupeiro', label: 'ROUPEIRO', sortOrder: 140 },
  { slug: 'compras', label: 'COMPRAS', sortOrder: 150 },
  { slug: 'rh', label: 'RH', sortOrder: 160 },
  { slug: 'financeiro', label: 'FINANCEIRO', sortOrder: 170 },
  { slug: 'ceo', label: 'CEO', sortOrder: 180 },
  { slug: 'marketing', label: 'MARKETING', sortOrder: 190 },
];

function normalizeRoleLabel(label: string): string {
  return label.trim().toLocaleUpperCase('pt-BR');
}

function fixUsername(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

function cadastroUpper(name: string): string {
  return name.trim().toLocaleUpperCase('pt-BR');
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function rowFromParts(parts: string[], sheet: 'ADM' | 'FUTEBOL'): SheetRow | null {
  // Colunas: vazio, NOME, USERNAME, EMAIL, CARGO, CLUBE, ROLE, (CARGO dup ADM), SENHA
  const name = parts[1]?.trim();
  const username = parts[2]?.trim();
  const email = parts[3]?.trim().toLowerCase();
  const cargo = parts[4]?.trim();
  const club = parts[5]?.trim();
  const role = parts[6]?.trim().toUpperCase();
  const password = (sheet === 'ADM' ? parts[8] : parts[7])?.trim() || '720425';

  if (!name || !username || !email || !role) return null;
  if (name.startsWith('***') || name === '720425') return null;
  if (!email.includes('@')) return null;

  return { name, username, email, cargo, club, role, password };
}

async function fetchSheetTab(sheet: 'ADM' | 'FUTEBOL'): Promise<SheetRow[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${sheet}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar aba ${sheet}: ${res.status}`);
  const text = await res.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  const rows: SheetRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = parseCsvLine(lines[i]);
    const row = rowFromParts(parts, sheet);
    if (row) rows.push(row);
  }
  return rows;
}

async function backfillModuleRoles(roleSlug: string) {
  const modules = await prisma.module.findMany({ select: { id: true } });
  for (const mod of modules) {
    await prisma.moduleRole.upsert({
      where: { moduleId_role: { moduleId: mod.id, role: roleSlug } },
      create: { moduleId: mod.id, role: roleSlug, canAccess: false },
      update: {},
    });
  }
}

async function ensureRoles() {
  for (const r of NEW_ROLES) {
    const existing = await prisma.platformRole.findUnique({ where: { slug: r.slug } });
    if (existing) {
      console.log(`  perfil já existe: ${r.slug}`);
      continue;
    }
    if (DRY_RUN) {
      console.log(`  [dry-run] criaria perfil: ${r.slug} (${r.label})`);
      continue;
    }
    await prisma.platformRole.create({
      data: {
        slug: r.slug,
        label: normalizeRoleLabel(r.label),
        sortOrder: r.sortOrder,
        canAccessDashboard: true,
        includeInMatrix: true,
        isSystem: false,
        isActive: true,
      },
    });
    await backfillModuleRoles(r.slug);
    console.log(`  perfil criado: ${r.slug}`);
  }
}

async function resolveTenantId(clubName: string): Promise<string> {
  const normalized = clubName.trim().toUpperCase();
  const tenants = await prisma.tenant.findMany({
    where: { slug: { not: 'bcg' } },
    select: { id: true, name: true },
  });
  const exact = tenants.find((t) => t.name.trim().toUpperCase() === normalized);
  if (exact) return exact.id;
  const partial = tenants.find(
    (t) =>
      t.name.toUpperCase().includes('BOSTON CITY FC') &&
      t.name.toUpperCase().includes('BRASIL'),
  );
  if (partial) return partial.id;
  throw new Error(`Tenant não encontrado para clube: ${clubName}`);
}

async function upsertUser(row: SheetRow, tenantId: string) {
  const roleSlug = ROLE_SLUG_MAP[row.role];
  if (!roleSlug) {
    throw new Error(`ROLE desconhecido na planilha: ${row.role}`);
  }

  const username = fixUsername(row.username);
  if (username.length < 3) {
    throw new Error(`Username inválido para ${row.name}: ${row.username}`);
  }

  const email = row.email.trim().toLowerCase();
  const name = cadastroUpper(row.name);
  const passwordHash = await bcrypt.hash(row.password || '720425', SALT_ROUNDS);

  const byEmail = await prisma.user.findUnique({ where: { email } });
  const byUsername = await prisma.user.findUnique({ where: { username } });

  if (DRY_RUN) {
    console.log(
      `  [dry-run] ${byEmail || byUsername ? 'atualizaria' : 'criaria'} ${username} | ${email} | role=${roleSlug} | cargo=${row.cargo}`,
    );
    return;
  }

  if (byEmail && byUsername && byEmail.id !== byUsername.id) {
    throw new Error(`Conflito email/username: ${email} / ${username}`);
  }

  const existing = byEmail ?? byUsername;

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        username,
        email,
        name,
        role: roleSlug,
        passwordHash,
        mustChangePassword: true,
        updatedAt: new Date(),
      },
    });
    await prisma.userTenant.deleteMany({ where: { userId: existing.id } });
    await prisma.userTenant.create({
      data: { userId: existing.id, tenantId },
    });
    console.log(`  atualizado: ${username} (${roleSlug})`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      email,
      username,
      name,
      role: roleSlug,
      passwordHash,
      mustChangePassword: true,
    },
  });
  await prisma.userTenant.create({
    data: { userId: user.id, tenantId },
  });
  console.log(`  criado: ${username} (${roleSlug}) — ${row.cargo}`);
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== IMPORTAÇÃO CUP360 USUÁRIOS ===');

  const [admRows, futebolRows] = await Promise.all([
    fetchSheetTab('ADM'),
    fetchSheetTab('FUTEBOL'),
  ]);
  const allRows = [...admRows, ...futebolRows];
  console.log(`Linhas: ADM=${admRows.length}, FUTEBOL=${futebolRows.length}, total=${allRows.length}`);

  const tenantId = await resolveTenantId(allRows[0]?.club ?? 'BOSTON CITY FC - BRASIL');
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
  console.log(`Tenant: ${tenant?.name} (${tenantId})`);

  console.log('\nPerfis:');
  await ensureRoles();

  console.log('\nUsuários:');
  for (const row of allRows) {
    try {
      await upsertUser(row, tenantId);
    } catch (err) {
      console.error(`  ERRO ${row.email}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log('\nConcluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
