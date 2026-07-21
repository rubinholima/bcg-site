/**
 * Corrige vazamento entre departamentos (financeiro, relatórios globais, etc.)
 * nos perfis novos do Cup360. Idempotente.
 *
 * Uso: pnpm fix:dept-access [--dry-run]
 */
import * as path from 'path';
import * as dotenv from 'dotenv';

const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, '.env') });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(cwd, '../../.env') });
}

const DRY_RUN = process.argv.includes('--dry-run');

const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');
const prisma = new PrismaClient();

/** Perfis novos — não altera gerente, company_admin, etc. */
const NEW_ROLES = [
  'supervisor',
  'treinador',
  'preparador',
  'roupeiro',
  'compras',
  'rh',
  'financeiro',
  'ceo',
  'marketing',
] as const;

/** Slugs que cada perfil PODE ter (whitelist). CEO mantém visão ampla ADM. */
const ROLE_ALLOWED: Record<string, readonly string[]> = {
  compras: [
    'dashboard',
    'dashboard__dashboard',
    'adm__adm_compras',
    'adm_compras',
    'adm__adm_estoque',
    'adm_estoque',
    'adm/adm_cadastros__adm_cad_fornecedores',
    'requisicoes__requisicoes_compra',
    'requisicoes',
    'configuracoes__config_compras',
    'configuracoes',
    'relatorios_adm',
  ],
  financeiro: [
    'dashboard',
    'dashboard__dashboard',
    'adm__adm_financeiro',
    'adm__adm_financeiro_aprovacoes',
    'adm_financeiro',
    'adm/adm_cadastros__adm_cad_clientes',
    'adm/adm_cadastros__adm_cad_fornecedores',
    'relatorios_adm',
  ],
  rh: ['dashboard', 'dashboard__dashboard', 'adm__adm_rh', 'adm_rh', 'relatorios_adm'],
  marketing: [
    'dashboard',
    'dashboard__dashboard',
    'marketing__marketing_planner',
    'marketing__marketing_boston_tv',
    'marketing__marketing_boston_tv_controle',
    'marketing__marketing_midias',
    'marketing__marketing_paginas',
    'marketing__marketing_noticias',
    'marketing',
    'midia',
    'noticias',
    'paginas',
    'eventos',
    'eventos__eventos_lista',
    'boston_tv',
    'assessoria_imprensa',
    'comunicacao__com_dash',
    'comunicacao__com_inbox',
    'comunicacao__com_canais',
    'comunicacao__com_templates',
    'comunicacao',
    'relatorios_marketing',
  ],
  roupeiro: [
    'dashboard',
    'dashboard__dashboard',
    'futebol__futebol_visao',
    'futebol__futebol_comissao',
    'futebol_comissao',
    'futebol__futebol_logistica',
    'futebol_logistica',
    'futebol/futebol_logistica__futebol_logistica_viagens',
    'futebol/futebol_logistica__futebol_logistica_agenda',
    'adm__adm_estoque',
    'adm_estoque',
  ],
};

/** Slugs sensíveis — revogar de perfis novos se não estiverem na whitelist do role. */
const SENSITIVE_SLUGS = [
  'adm_financeiro',
  'adm__adm_financeiro',
  'adm__adm_financeiro_aprovacoes',
  'adm__adm_visao',
  'adm_visao',
  'adm__adm_rh',
  'adm_rh',
  'adm__adm_patrimonio',
  'adm_patrimonio',
  'adm__adm_ti',
  'adm_ti',
  'adm__adm_compras',
  'adm_compras',
  'adm__adm_estoque',
  'adm_estoque',
  'adm/adm_cadastros__adm_cad_clientes',
  'relatorios',
  'relatorios_futebol',
  'relatorios_saude',
  'relatorios_marketing',
  'relatorios_juridico',
  'relatorios_eventos',
  'relatorios_adm',
  'relatorios_grupo_master',
  'relatorios_socio_torcedor',
  'diretoria',
  'grupo_master',
];

async function fixImpliesSlug() {
  const patches: Array<{ slug: string; impliesSlug: string | null }> = [
    { slug: 'adm__adm_visao', impliesSlug: 'adm_visao' },
    { slug: 'relatorios_adm', impliesSlug: null },
    { slug: 'relatorios_futebol', impliesSlug: null },
    { slug: 'relatorios_saude', impliesSlug: null },
    { slug: 'relatorios_marketing', impliesSlug: null },
    { slug: 'relatorios_juridico', impliesSlug: null },
    { slug: 'relatorios_eventos', impliesSlug: null },
    { slug: 'relatorios_grupo_master', impliesSlug: null },
    { slug: 'relatorios_socio_torcedor', impliesSlug: null },
    { slug: 'adm/adm_cadastros__adm_cad_fornecedores', impliesSlug: 'adm_compras' },
  ];

  for (const p of patches) {
    const mod = await prisma.module.findUnique({ where: { slug: p.slug } });
    if (!mod) continue;
    if (mod.impliesSlug === p.impliesSlug) continue;
    console.log(`  impliesSlug ${p.slug}: ${mod.impliesSlug ?? 'null'} → ${p.impliesSlug ?? 'null'}`);
    if (!DRY_RUN) {
      await prisma.module.update({
        where: { slug: p.slug },
        data: { impliesSlug: p.impliesSlug },
      });
    }
  }

  // Garante módulo adm_visao (hub ADM sem puxar financeiro)
  const admVisao = await prisma.module.findUnique({ where: { slug: 'adm_visao' } });
  if (!admVisao && !DRY_RUN) {
    await prisma.module.create({
      data: {
        slug: 'adm_visao',
        name: 'ADM — visão geral',
        sortOrder: 9998,
        functionalArea: 'adm_departamentos',
        impliesSlug: null,
      },
    });
    console.log('  criado módulo adm_visao');
    const managed = await prisma.platformRole.findMany({
      where: { isActive: true, includeInMatrix: true },
      select: { slug: true },
    });
    const mod = await prisma.module.findUnique({ where: { slug: 'adm_visao' } });
    if (mod) {
      for (const r of managed) {
        await prisma.moduleRole.upsert({
          where: { moduleId_role: { moduleId: mod.id, role: r.slug } },
          create: { moduleId: mod.id, role: r.slug, canAccess: false },
          update: {},
        });
      }
    }
  }
}

async function revokeLeaked(role: string, allowed: readonly string[]) {
  const allowedSet = new Set(allowed);
  const rows = await prisma.moduleRole.findMany({
    where: { role, canAccess: true },
    include: { module: { select: { slug: true } } },
  });

  let revoked = 0;
  for (const row of rows) {
    const slug = row.module.slug;
    if (allowedSet.has(slug)) continue;
    if (!SENSITIVE_SLUGS.includes(slug) && !slug.startsWith('relatorios_')) continue;

    console.log(`  REVOKE ${role} ✕ ${slug}`);
    revoked++;
    if (!DRY_RUN) {
      await prisma.moduleRole.update({
        where: { id: row.id },
        data: { canAccess: false },
      });
    }
  }
  return revoked;
}

async function grantAllowed(role: string, allowed: readonly string[]) {
  const modules = await prisma.module.findMany({
    where: { slug: { in: [...allowed] } },
    select: { id: true, slug: true },
  });
  let granted = 0;
  for (const mod of modules) {
    const existing = await prisma.moduleRole.findUnique({
      where: { moduleId_role: { moduleId: mod.id, role } },
    });
    if (existing?.canAccess) continue;
    console.log(`  GRANT ${role} ← ${mod.slug}`);
    granted++;
    if (!DRY_RUN) {
      await prisma.moduleRole.upsert({
        where: { moduleId_role: { moduleId: mod.id, role } },
        create: { moduleId: mod.id, role, canAccess: true },
        update: { canAccess: true },
      });
    }
  }
  return granted;
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN — isolamento por departamento ===' : '=== Corrigindo isolamento por departamento ===');

  console.log('\n1) Ajustando impliesSlug no banco…');
  await fixImpliesSlug();

  console.log('\n2) Perfis ADM / Mkt (whitelist)…');
  for (const role of ['compras', 'financeiro', 'rh', 'marketing', 'roupeiro'] as const) {
    const allowed = ROLE_ALLOWED[role];
    if (!allowed) continue;
    console.log(`\n[${role}]`);
    await revokeLeaked(role, allowed);
    await grantAllowed(role, allowed);
  }

  console.log('\n3) Revogando ADM/financeiro/relatórios cruzados dos demais perfis novos…');
  for (const role of NEW_ROLES) {
    if (role in ROLE_ALLOWED || role === 'ceo') continue;
    const rows = await prisma.moduleRole.findMany({
      where: {
        role,
        canAccess: true,
        module: {
          slug: {
            in: [
              'adm_financeiro',
              'adm__adm_financeiro',
              'adm__adm_financeiro_aprovacoes',
              'adm__adm_visao',
              'adm_visao',
              'adm__adm_rh',
              'adm__adm_compras',
              'adm__adm_estoque',
              'adm__adm_patrimonio',
              'relatorios',
              'relatorios_adm',
              'relatorios_grupo_master',
            ],
          },
        },
      },
      include: { module: { select: { slug: true } } },
    });
    for (const row of rows) {
      // Futebol mantém relatorios_futebol
      if (row.module.slug === 'relatorios_adm') {
        console.log(`  REVOKE ${role} ✕ relatorios_adm`);
        if (!DRY_RUN) {
          await prisma.moduleRole.update({ where: { id: row.id }, data: { canAccess: false } });
        }
      }
      if (row.module.slug.startsWith('adm')) {
        console.log(`  REVOKE ${role} ✕ ${row.module.slug}`);
        if (!DRY_RUN) {
          await prisma.moduleRole.update({ where: { id: row.id }, data: { canAccess: false } });
        }
      }
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
