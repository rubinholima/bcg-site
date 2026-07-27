/**
 * Importa usuários das abas da planilha Cup360 BCFC.
 *
 * Planilha: https://docs.google.com/spreadsheets/d/19slG84asLFQ376Ll7tH9tJst7aDpvjxEOjbVnz4tf4o
 *
 * Campos: NOME → name | USERNAME → username | EMAIL → email | ROLE → role (slug)
 *         CLUBE → tenant | SENHA INICIAL → password (mustChangePassword=true)
 *
 * Uso:
 *   cd apps/api
 *   pnpm import:cup360-users                              # todas as abas
 *   pnpm import:cup360-users -- --tabs=FISIOTERAPIA,PERFORMANCE,SAUDE
 *   pnpm import:cup360-users -- --dry-run --tabs=FISIOTERAPIA,PERFORMANCE,SAUDE
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

const ALL_SHEET_TABS = [
  'ADM',
  'FUTEBOL',
  'FISIOTERAPIA',
  'PERFORMANCE',
  'SAUDE',
  'PSICOLOGIA',
] as const;

type SheetTab = (typeof ALL_SHEET_TABS)[number];

type SheetRow = {
  sheet: SheetTab;
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
  FISIOTERAPIA: 'fisioterapia',
  ESTAGIARIO: 'estagiario',
  ESTAGIARIA: 'estagiaria',
  MASSAGISTA: 'massagista',
  COORDENADOR: 'coordenador',
  COORDENADORA: 'coordenadora',
  NUTRICIONISTA: 'nutricionista',
  ENFERMEIRO: 'enfermeiro',
  ENFERMEIRA: 'enfermeiro',
  ENFERMEIRO_TEC: 'enfermeiro_tec',
  PSICOLOGO: 'psicologo',
  PSICOLOGA: 'psicologo',
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
  { slug: 'fisioterapia', label: 'FISIOTERAPIA', sortOrder: 200 },
  { slug: 'estagiario', label: 'ESTAGIÁRIO', sortOrder: 210 },
  { slug: 'estagiaria', label: 'ESTAGIÁRIA', sortOrder: 215 },
  { slug: 'massagista', label: 'MASSAGISTA', sortOrder: 220 },
  { slug: 'coordenador', label: 'COORDENADOR', sortOrder: 230 },
  { slug: 'coordenadora', label: 'COORDENADORA', sortOrder: 235 },
  { slug: 'nutricionista', label: 'NUTRICIONISTA', sortOrder: 240 },
  { slug: 'enfermeiro', label: 'ENFERMEIRO', sortOrder: 250 },
  { slug: 'enfermeiro_tec', label: 'TÉCNICO ENFERMAGEM', sortOrder: 255 },
];

function parseTabsArg(): SheetTab[] {
  const parts: string[] = [];
  for (let i = 0; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a.startsWith('--tabs=')) {
      parts.push(...a.slice('--tabs='.length).split(/[,\s]+/));
      continue;
    }
    if (a === '--tabs') {
      const next = process.argv[i + 1];
      if (next && !next.startsWith('--')) {
        parts.push(...next.split(/[,\s]+/));
        i++;
      }
    }
  }

  const tabs = parts.map((t) => t.trim().toUpperCase()).filter(Boolean);
  if (!tabs.length) return [...ALL_SHEET_TABS];

  const invalid = tabs.filter((t) => !ALL_SHEET_TABS.includes(t as SheetTab));
  if (invalid.length) {
    throw new Error(`Abas inválidas: ${invalid.join(', ')}. Válidas: ${ALL_SHEET_TABS.join(', ')}`);
  }
  return tabs as SheetTab[];
}

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

function normalizeRoleKey(key: string): string {
  return key
    .trim()
    .toLocaleUpperCase('pt-BR')
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function resolveRoleKey(sheet: SheetTab, parts: SheetRow): string {
  const cargo = normalizeRoleKey(parts.cargo);
  if (sheet === 'SAUDE') {
    if (cargo.includes('ENFERMEIR')) return 'ENFERMEIRO';
    if (cargo.includes('TECNICO') && cargo.includes('ENFERMAGEM')) return 'ENFERMEIRO_TEC';
  }
  return normalizeRoleKey(parts.role);
}

function rowFromParts(parts: string[], sheet: SheetTab): SheetRow | null {
  // Colunas: vazio, NOME, USERNAME, EMAIL, CARGO, CLUBE, ROLE, (CARGO dup ADM), SENHA
  const name = parts[1]?.trim();
  const username = parts[2]?.trim();
  const email = parts[3]?.trim().toLowerCase();
  const cargo = parts[4]?.trim();
  const club = parts[5]?.trim();
  const role = parts[6]?.trim().toUpperCase();
  const password = (sheet === 'ADM' ? parts[8] : parts[7])?.trim() || '720425';

  if (!name || !username || !role) return null;
  if (name.startsWith('***') || name === '720425') return null;
  if (!email?.includes('@')) return null;

  const row: SheetRow = { sheet, name, username, email, cargo, club, role, password };
  row.role = resolveRoleKey(sheet, row);
  return row;
}

async function fetchSheetTab(sheet: SheetTab): Promise<SheetRow[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
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
  const roleKey = normalizeRoleKey(row.role);
  const roleSlug = ROLE_SLUG_MAP[roleKey];
  if (!roleSlug) {
    throw new Error(`ROLE desconhecido na planilha (${row.sheet}): ${row.role}`);
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
      `  [dry-run] ${byEmail || byUsername ? 'atualizaria' : 'criaria'} [${row.sheet}] ${username} | ${email} | role=${roleSlug} | cargo=${row.cargo}`,
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
    console.log(`  atualizado [${row.sheet}]: ${username} (${roleSlug})`);
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
  console.log(`  criado [${row.sheet}]: ${username} (${roleSlug}) — ${row.cargo}`);
}

async function main() {
  const tabs = parseTabsArg();
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== IMPORTAÇÃO CUP360 USUÁRIOS ===');
  console.log(`Abas: ${tabs.join(', ')}`);

  const batches = await Promise.all(tabs.map(async (tab) => ({ tab, rows: await fetchSheetTab(tab) })));
  for (const b of batches) {
    console.log(`  ${b.tab}: ${b.rows.length} linha(s)`);
  }
  const allRows = batches.flatMap((b) => b.rows);
  console.log(`Total: ${allRows.length} usuário(s)`);

  if (allRows.length === 0) {
    console.log('\nNenhuma linha válida (verifique e-mails na planilha).');
    return;
  }

  const tenantId = await resolveTenantId(allRows[0]?.club ?? 'BOSTON CITY FC - BRASIL');
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
  console.log(`Tenant: ${tenant?.name} (${tenantId})`);

  console.log('\nPerfis:');
  await ensureRoles();

  console.log('\nUsuários:');
  const skipped: string[] = [];
  for (const tab of tabs) {
    const tabRows = batches.find((b) => b.tab === tab)?.rows ?? [];
    if (tabRows.length === 0) {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`;
      const res = await fetch(url);
      const text = await res.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      for (let i = 1; i < lines.length; i++) {
        const parts = parseCsvLine(lines[i]);
        const name = parts[1]?.trim();
        const username = parts[2]?.trim();
        const email = parts[3]?.trim();
        if (name && username && !email?.includes('@') && !name.startsWith('***')) {
          skipped.push(`${tab}: ${name} (${username}) — sem e-mail`);
        }
      }
    }
  }

  for (const row of allRows) {
    try {
      await upsertUser(row, tenantId);
    } catch (err) {
      console.error(`  ERRO [${row.sheet}] ${row.email}:`, err instanceof Error ? err.message : err);
    }
  }

  if (skipped.length) {
    console.log('\nIgnorados (sem e-mail na planilha):');
    for (const s of skipped) console.log(`  - ${s}`);
  }

  console.log('\nConcluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
