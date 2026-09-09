/**
 * Importa usuários das abas da planilha Cup360.
 *
 * Planilha BCFC (padrão):
 *   https://docs.google.com/spreadsheets/d/19slG84asLFQ376Ll7tH9tJst7aDpvjxEOjbVnz4tf4o
 *   Colunas: NOME, USERNAME, EMAIL, CARGO, CLUBE, ROLE, SENHA INICIAL
 *
 * Planilha cargo-only (ex.: Vila Nova):
 *   --sheet-id=... --tenant-slug=villa-nova-saf --layout=cargo
 *   Colunas: NOME, USERNAME, EMAIL, CARGO, SENHA INICIAL
 *
 * Comportamento padrão: cadastra só quem ainda não existe (e-mail ou username).
 * Com --tenant-slug/--tenant-id: reutiliza conta existente por e-mail e garante UserTenant.
 * Use --update-existing para sobrescrever dados/senha de quem já está cadastrado.
 *
 * Uso:
 *   cd apps/api
 *   pnpm import:cup360-users                              # BCFC, todas as abas, só novos
 *   pnpm import:cup360-users -- --tabs=FUTEBOL
 *   pnpm import:cup360-users -- --dry-run --tabs=FUTEBOL
 *   pnpm import:cup360-users -- --update-existing --tabs=FUTEBOL
 *   pnpm import:cup360-users -- --dry-run --sheet-id=1Nwql37... --tenant-slug=villa-nova-saf --layout=cargo
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
/** Padrão: não alterar quem já está cadastrado. */
const SKIP_EXISTING = !process.argv.includes('--update-existing');

const DEFAULT_BCFC_SHEET_ID = '19slG84asLFQ376Ll7tH9tJst7aDpvjxEOjbVnz4tf4o';

function parseArg(prefix: string): string | undefined {
  const eq = process.argv.find((a) => a.startsWith(`${prefix}=`));
  if (eq) return eq.slice(prefix.length + 1);
  const idx = process.argv.indexOf(prefix);
  if (idx >= 0) {
    const next = process.argv[idx + 1];
    if (next && !next.startsWith('--')) return next;
  }
  return undefined;
}

const SHEET_ID = parseArg('--sheet-id') ?? DEFAULT_BCFC_SHEET_ID;
const TENANT_SLUG = parseArg('--tenant-slug');
const TENANT_ID_ARG = parseArg('--tenant-id');
const LAYOUT = parseArg('--layout') ?? (TENANT_SLUG || TENANT_ID_ARG ? 'cargo' : 'bcfc');
const ENSURE_TENANT = Boolean(TENANT_SLUG || TENANT_ID_ARG);

const ALL_SHEET_TABS = [
  'ADM',
  'FUTEBOL',
  'FISIOTERAPIA',
  'PERFORMANCE',
  'SAUDE',
  'PSICOLOGIA',
] as const;

type SheetTab = (typeof ALL_SHEET_TABS)[number];
type ImportAction = 'CREATE' | 'EXISTING' | 'UPDATE' | 'BLOCKED';

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

type ImportPlan = {
  row: SheetRow;
  roleKey: string | null;
  roleSlug: string | null;
  deptLabel: string;
  action: ImportAction;
  detail: string;
  existingUsername?: string;
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
  ASSISTENTE: 'assistente',
  PEDAGOGA: 'pedagoga',
  CAPTADOR: 'captador',
  MEDICO: 'medico',
  ADMINISTRATIVO: 'administrativo',
};

const ROLE_DEPT_LABEL: Record<string, string> = {
  gerente: 'ADM / Futebol (gerência)',
  administrativo: 'ADM operacional',
  ceo: 'ADM (direção)',
  marketing: 'Marketing / Comunicação',
  financeiro: 'ADM Financeiro',
  rh: 'ADM RH',
  compras: 'ADM Compras',
  supervisor: 'Futebol (supervisão)',
  treinador: 'Futebol (comissão técnica)',
  preparador: 'Futebol (preparação física / goleiros)',
  analista: 'Futebol (análise de desempenho)',
  roupeiro: 'Futebol (logística / material)',
  captador: 'Futebol (captação)',
  fisioterapia: 'Saúde / Fisioterapia',
  massagista: 'Saúde / Fisioterapia (massagem)',
  coordenador: 'Futebol / Performance',
  coordenadora: 'Futebol / Performance',
  nutricionista: 'Performance / Nutrição',
  enfermeiro: 'Saúde / Enfermagem',
  enfermeiro_tec: 'Saúde / Enfermagem técnica',
  medico: 'Saúde / Médico',
  psicologo: 'Saúde / Psicologia',
  assistente: 'Assistência Social',
  pedagoga: 'Assistência Social / Pedagogia',
  estagiario: 'Saúde (estagiário)',
  estagiaria: 'Saúde (estagiária)',
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
  { slug: 'assistente', label: 'ASSISTENTE SOCIAL', sortOrder: 260 },
  { slug: 'pedagoga', label: 'PEDAGOGA', sortOrder: 265 },
  { slug: 'captador', label: 'CAPTADOR', sortOrder: 270 },
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

/**
 * Mapeia CARGO + aba para chave ROLE existente no CUP360.
 * Retorna null quando não há mapeamento determinístico (bloqueia import).
 */
function resolveCargoRoleKey(sheet: SheetTab, cargoRaw: string): string | null {
  const c = normalizeRoleKey(cargoRaw);
  if (!c) return null;

  if (sheet === 'SAUDE') {
    if (c.includes('ADVOGAD')) return null;
    if (c.includes('ENFERMEIR')) return 'ENFERMEIRO';
    if (c.includes('TECNICO') && c.includes('ENFERMAGEM')) return 'ENFERMEIRO_TEC';
    if (c.includes('MEDICO')) return 'MEDICO';
    if (c.includes('NUTRICIONIST')) return 'NUTRICIONISTA';
    if (c.includes('COORDENADOR') && c.includes('SAUDE')) return 'ENFERMEIRO';
    return null;
  }

  if (sheet === 'PSICOLOGIA') {
    if (c.includes('PSICOLOG')) return 'PSICOLOGO';
    if (c.includes('ESTAGIARI')) return c.endsWith('A') ? 'ESTAGIARIA' : 'ESTAGIARIO';
    return null;
  }

  if (sheet === 'FISIOTERAPIA') {
    if (c.includes('COORDENADOR') && c.includes('FISIOTER')) return 'FISIOTERAPIA';
    if (c.includes('FISIOTER')) return 'FISIOTERAPIA';
    if (c.includes('ESTAGIARI')) return 'ESTAGIARIO';
    if (c.includes('MASSAG') || c.includes('MASSOTERAPEUT')) return 'MASSAGISTA';
    return null;
  }

  if (sheet === 'PERFORMANCE') {
    if (c.includes('COORDENADOR') && c.includes('PERFORMANCE')) return 'COORDENADOR';
    if (c.includes('NUTRICIONIST')) return 'NUTRICIONISTA';
    if (c.includes('ANALISTA')) return 'ANALISTA';
    return null;
  }

  if (sheet === 'ADM') {
    if (c === 'CEO' || c.startsWith('CEO ')) return 'CEO';
    if (c.includes('ADVOGAD')) return null;
    if (c.includes('MARKETING')) return 'MARKETING';
    if (c.includes('GERENTE')) return 'GERENTE';
    if (c.includes('ADMINISTRADOR') && c.includes('OPERACIONAL')) return 'ADMINISTRATIVO';
    if (c.includes('FINANCEIRO')) return 'FINANCEIRO';
    if (c.includes('RH')) return 'RH';
    if (c.includes('COMPRAS')) return 'COMPRAS';
    return null;
  }

  // FUTEBOL
  if (c.includes('ASSISTENTE') && c.includes('SOCIAL')) return 'ASSISTENTE';
  if (c.includes('PEDAGOG')) return 'PEDAGOGA';
  if (c.includes('CAPTAD')) return 'CAPTADOR';
  if (c.includes('GERENTE') && c.includes('FUTEBOL')) return 'GERENTE';
  if (c.includes('SUPERVISOR')) return 'SUPERVISOR';
  if (c.includes('ANALISTA')) return 'ANALISTA';
  if (c.includes('ROUPEIRO')) return 'ROUPEIRO';
  if (c.includes('MASSOTERAPEUT') || c.includes('MASSAGIST')) return 'MASSAGISTA';
  if (c.includes('PREPARADOR') && c.includes('GOLEIRO')) return 'PREPARADOR';
  if (c.includes('PREPARADOR') && c.includes('FISIC')) return 'PREPARADOR';
  if (c.includes('PREGADOR') && c.includes('FISIC')) return 'PREPARADOR';
  if (c.includes('PREPARADOR') || c.includes('PREGADOR')) return 'PREPARADOR';
  if (c.includes('AUXILIAR') && c.includes('TECNIC')) return 'TREINADOR';
  if (c.includes('COORDENADOR') && c.includes('TECNIC')) return 'TREINADOR';
  if (c.includes('TECNICO') || c.includes('TREINADOR')) return 'TREINADOR';
  return null;
}

function resolveRoleKey(sheet: SheetTab, parts: SheetRow): string {
  const cargo = normalizeRoleKey(parts.cargo);
  if (sheet === 'SAUDE') {
    if (cargo.includes('ENFERMEIR')) return 'ENFERMEIRO';
    if (cargo.includes('TECNICO') && cargo.includes('ENFERMAGEM')) return 'ENFERMEIRO_TEC';
  }
  return normalizeRoleKey(parts.role);
}

function rowFromPartsBcfc(parts: string[], sheet: SheetTab): SheetRow | null {
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

function rowFromPartsCargo(parts: string[], sheet: SheetTab): SheetRow | null {
  const name = parts[1]?.trim();
  const username = parts[2]?.trim();
  const email = parts[3]?.trim().toLowerCase();
  const cargo = parts[4]?.trim();
  const password = parts[5]?.trim() || '720425';

  if (!name || !username || !cargo) return null;
  if (name.startsWith('***') || name === '720425') return null;
  if (!email?.includes('@')) return null;

  const roleKey = resolveCargoRoleKey(sheet, cargo);
  const row: SheetRow = {
    sheet,
    name,
    username,
    email,
    cargo,
    club: '',
    role: roleKey ?? '',
    password,
  };
  return row;
}

async function fetchSheetTab(sheet: SheetTab): Promise<SheetRow[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Falha ao baixar aba ${sheet}: ${res.status}`);
  const text = await res.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  const rows: SheetRow[] = [];
  const parseRow = LAYOUT === 'cargo' ? rowFromPartsCargo : rowFromPartsBcfc;
  for (let i = 1; i < lines.length; i++) {
    const parts = parseCsvLine(lines[i]);
    const row = parseRow(parts, sheet);
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
  if (TENANT_ID_ARG) return TENANT_ID_ARG;
  if (TENANT_SLUG) {
    const bySlug = await prisma.tenant.findUnique({
      where: { slug: TENANT_SLUG },
      select: { id: true },
    });
    if (!bySlug) throw new Error(`Tenant não encontrado para slug: ${TENANT_SLUG}`);
    return bySlug.id;
  }

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

async function planImport(row: SheetRow): Promise<ImportPlan> {
  const username = fixUsername(row.username);
  const email = row.email.trim().toLowerCase();

  if (username.length < 3) {
    return {
      row,
      roleKey: null,
      roleSlug: null,
      deptLabel: '—',
      action: 'BLOCKED',
      detail: `Username inválido: ${row.username}`,
    };
  }

  const byEmail = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const byUsername = await prisma.user.findUnique({ where: { username } });

  if (byEmail && byUsername && byEmail.id !== byUsername.id) {
    return {
      row,
      roleKey: null,
      roleSlug: null,
      deptLabel: '—',
      action: 'BLOCKED',
      detail: `Conflito global email/username (${email} vs ${username})`,
    };
  }

  const existing = byEmail ?? byUsername;
  if (existing) {
    const mappedKey =
      LAYOUT === 'cargo'
        ? resolveCargoRoleKey(row.sheet, row.cargo)
        : normalizeRoleKey(row.role);
    const mappedSlug = mappedKey ? ROLE_SLUG_MAP[mappedKey] ?? null : null;
    const effectiveSlug = mappedSlug ?? existing.role ?? 'user';
    const action: ImportAction = SKIP_EXISTING ? 'EXISTING' : 'UPDATE';
    const detail =
      existing.username !== username
        ? `conta existente (${existing.username}, role=${existing.role}) — e-mail ${email}`
        : `já cadastrado (role=${existing.role})`;
    return {
      row,
      roleKey: mappedKey,
      roleSlug: effectiveSlug,
      deptLabel: ROLE_DEPT_LABEL[effectiveSlug] ?? effectiveSlug,
      action,
      detail,
      existingUsername: existing.username,
    };
  }

  let roleKey: string | null;
  if (LAYOUT === 'cargo') {
    roleKey = resolveCargoRoleKey(row.sheet, row.cargo);
    if (!roleKey) {
      return {
        row,
        roleKey: null,
        roleSlug: null,
        deptLabel: '—',
        action: 'BLOCKED',
        detail: `CARGO não mapeado: ${row.cargo}`,
      };
    }
  } else {
    roleKey = normalizeRoleKey(row.role);
  }

  const roleSlug = roleKey ? ROLE_SLUG_MAP[roleKey] ?? null : null;
  if (!roleSlug) {
    return {
      row,
      roleKey,
      roleSlug: null,
      deptLabel: '—',
      action: 'BLOCKED',
      detail: `ROLE desconhecido: ${row.role || row.cargo}`,
    };
  }

  return {
    row,
    roleKey,
    roleSlug,
    deptLabel: ROLE_DEPT_LABEL[roleSlug] ?? roleSlug,
    action: 'CREATE',
    detail: 'novo usuário',
  };
}

function printDryRunTable(plans: ImportPlan[]) {
  console.log('\n=== DRY RUN TABLE ===');
  console.log(
    'NAME | USERNAME | EMAIL | TAB | CARGO | RESOLVED ROLE | DEPARTMENT/MODULE ACCESS | ACTION',
  );
  for (const p of plans) {
    const username = fixUsername(p.row.username);
    const roleOut = p.roleSlug ? `${p.roleKey} → ${p.roleSlug}` : '—';
    let actionOut = p.action;
    if (p.action === 'EXISTING' && p.existingUsername && p.existingUsername !== username) {
      actionOut = 'EXISTING';
    }
    console.log(
      [
        p.row.name,
        username,
        p.row.email,
        p.row.sheet,
        p.row.cargo,
        roleOut,
        p.deptLabel,
        `${actionOut}${p.detail ? ` (${p.detail})` : ''}`,
      ].join(' | '),
    );
  }
  const counts = {
    CREATE: plans.filter((p) => p.action === 'CREATE').length,
    EXISTING: plans.filter((p) => p.action === 'EXISTING').length,
    UPDATE: plans.filter((p) => p.action === 'UPDATE').length,
    BLOCKED: plans.filter((p) => p.action === 'BLOCKED').length,
  };
  console.log(
    `\nResumo: CREATE=${counts.CREATE} EXISTING=${counts.EXISTING} UPDATE=${counts.UPDATE} BLOCKED=${counts.BLOCKED}`,
  );
}

async function ensureUserTenant(userId: string, tenantId: string) {
  const link = await prisma.userTenant.findUnique({
    where: { userId_tenantId: { userId, tenantId } },
  });
  if (!link) {
    await prisma.userTenant.create({ data: { userId, tenantId } });
    console.log(`  vínculo UserTenant criado para tenant ${tenantId}`);
  }
}

async function executePlan(plan: ImportPlan, tenantId: string) {
  if (plan.action === 'BLOCKED') {
    console.log(`  BLOQUEADO [${plan.row.sheet}] ${plan.row.email}: ${plan.detail}`);
    return;
  }

  const row = plan.row;
  const roleSlug = plan.roleSlug!;
  const username = fixUsername(row.username);
  const email = row.email.trim().toLowerCase();
  const name = cadastroUpper(row.name);
  const passwordHash = await bcrypt.hash(row.password || '720425', SALT_ROUNDS);

  const byEmail = await prisma.user.findUnique({ where: { email } });
  const byUsername = await prisma.user.findUnique({ where: { username } });
  const existing = byEmail ?? byUsername;

  if (existing && SKIP_EXISTING) {
    if (ENSURE_TENANT) await ensureUserTenant(existing.id, tenantId);
    console.log(
      `  reutilizado [${row.sheet}]: ${existing.username} (${existing.role}) — planilha=${username}`,
    );
    return;
  }

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
    await prisma.userTenant.create({ data: { userId: existing.id, tenantId } });
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
  await prisma.userTenant.create({ data: { userId: user.id, tenantId } });
  console.log(`  criado [${row.sheet}]: ${username} (${roleSlug}) — ${row.cargo}`);
}

async function main() {
  const tabs = parseTabsArg();
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== IMPORTAÇÃO CUP360 USUÁRIOS ===');
  console.log(`Planilha: ${SHEET_ID}`);
  console.log(`Layout: ${LAYOUT}`);
  console.log(
    SKIP_EXISTING
      ? 'Modo: só novos (padrão — quem já existe é reutilizado com --tenant-slug)'
      : 'Modo: --update-existing (atualiza quem já existe)',
  );
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
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, slug: true } });
  console.log(`Tenant: ${tenant?.name} (${tenant?.slug}) — ${tenantId}`);

  console.log('\nPerfis:');
  await ensureRoles();

  console.log('\nPlanejamento:');
  const plans: ImportPlan[] = [];
  for (const row of allRows) {
    plans.push(await planImport(row));
  }

  if (DRY_RUN) {
    printDryRunTable(plans);
    console.log('\nConcluído (dry-run).');
    return;
  }

  const blocked = plans.filter((p) => p.action === 'BLOCKED');
  if (blocked.length) {
    printDryRunTable(plans);
    throw new Error(`${blocked.length} candidato(s) bloqueado(s) — importação abortada.`);
  }

  console.log('\nUsuários:');
  for (const plan of plans) {
    try {
      await executePlan(plan, tenantId);
    } catch (err) {
      console.error(
        `  ERRO [${plan.row.sheet}] ${plan.row.email}:`,
        err instanceof Error ? err.message : err,
      );
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
