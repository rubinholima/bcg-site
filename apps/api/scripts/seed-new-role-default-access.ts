/**
 * Aplica permissões padrão (aditivas) na matriz de Acessos apenas para os
 * perfis novos importados do Cup360. Não altera roles existentes nem remove
 * permissões já concedidas.
 *
 * Uso: pnpm seed:new-role-access [--dry-run]
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

/** Slugs de menu/módulo no banco — ver scripts/list-module-slugs.ts */
const FUTEBOL_HUB = ['dashboard__dashboard', 'dashboard', 'futebol__futebol_visao'];

const FUTEBOL_CADASTROS = [
  'futebol/futebol_cadastros__cad_jogadores',
  'futebol/futebol_cadastros__cad_jogadores_desligados',
  'futebol/futebol_cadastros__cad_campeonatos',
  'futebol/futebol_cadastros__cad_estadios',
  'futebol/futebol_cadastros__cad_times',
  'futebol/futebol_cadastros__cad_categorias',
  'futebol/futebol_cadastros__cad_espacos',
];

const FUTEBOL_COMISSAO_LOGISTICA = [
  'futebol__futebol_comissao',
  'futebol_comissao',
  'futebol__futebol_logistica',
  'futebol_logistica',
  'futebol/futebol_logistica__futebol_logistica_viagens',
  'futebol/futebol_logistica__futebol_logistica_agenda',
  'futebol/futebol_agenda__futebol_agenda_cal',
  'agenda__agenda',
  'agenda',
];

const FUTEBOL_ANALISE = [
  'futebol/futebol_analise_desempenho__futebol_analise_desempenho_dash',
  'futebol/futebol_analise_desempenho__futebol_analise_video',
  'futebol/futebol_analise_desempenho__futebol_metricas_atletas',
  'futebol_analise_desempenho',
  'futebol_analise',
  'futebol/analise__avaliacoes',
  'futebol/analise__desempenho',
  'player_tab__desempenho',
];

const FUTEBOL_PERFORMANCE = [
  'futebol/futebol_performance__futebol_performance_dash',
  'futebol/futebol_performance__futebol_fisiologista',
  'futebol/futebol_performance__futebol_preparacao_fisica',
  'futebol/futebol_performance__futebol_nutricionista',
  'futebol__futebol_fisiologia',
  'futebol_performance',
  'futebol_preparacao_fisica',
  'futebol_fisiologia',
];

const FUTEBOL_CAPTACAO = [
  'futebol__futebol_captacao',
  'futebol_captacao',
  'futebol__futebol_tryouts',
  'futebol_tryouts',
  'futebol__futebol_avaliacoes',
  'player_tab__status',
  'diretoria',
];

const ADM_COMPRAS = [
  'dashboard__dashboard',
  'dashboard',
  'adm__adm_compras',
  'adm__adm_estoque',
  'adm_compras',
  'adm_estoque',
  'adm/adm_cadastros__adm_cad_fornecedores',
  'requisicoes__requisicoes_compra',
  'configuracoes__config_compras',
  'relatorios_adm',
];

const ADM_FINANCEIRO = [
  'dashboard__dashboard',
  'dashboard',
  'adm__adm_financeiro',
  'adm__adm_financeiro_aprovacoes',
  'adm_financeiro',
  'adm/adm_cadastros__adm_cad_clientes',
  'adm/adm_cadastros__adm_cad_fornecedores',
  'relatorios_adm',
];

const ADM_RH = [
  'dashboard__dashboard',
  'dashboard',
  'adm__adm_rh',
  'adm_rh',
  'relatorios_adm',
];

const ADM_CEO = [
  'dashboard__dashboard',
  'dashboard',
  'futebol__futebol_visao',
  'adm__adm_visao',
  'adm_visao',
  'adm__adm_financeiro',
  'adm__adm_financeiro_aprovacoes',
  'adm__adm_compras',
  'adm__adm_estoque',
  'adm__adm_rh',
  'adm__adm_patrimonio',
  'adm_financeiro',
  'adm_compras',
  'adm_estoque',
  'adm_rh',
  'adm_patrimonio',
  'adm/adm_cadastros__adm_cad_clientes',
  'adm/adm_cadastros__adm_cad_fornecedores',
  'diretoria',
  'relatorios_adm',
  'relatorios_futebol',
];

const MARKETING_FULL = [
  'dashboard__dashboard',
  'dashboard',
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
];

/** Apenas estes perfis — nunca alterar gerente, analista, comissao, etc. */
const NEW_ROLE_DEFAULTS: Record<string, readonly string[]> = {
  supervisor: [
    ...FUTEBOL_HUB,
    ...FUTEBOL_CADASTROS,
    ...FUTEBOL_COMISSAO_LOGISTICA,
    ...FUTEBOL_ANALISE,
    ...FUTEBOL_PERFORMANCE,
    ...FUTEBOL_CAPTACAO,
    'relatorios_futebol',
  ],
  treinador: [
    ...FUTEBOL_HUB,
    ...FUTEBOL_CADASTROS.filter((s) => !s.includes('desligados')),
    ...FUTEBOL_COMISSAO_LOGISTICA,
    ...FUTEBOL_ANALISE,
    'futebol/futebol_performance__futebol_performance_dash',
    'futebol_performance',
    'relatorios_futebol',
  ],
  preparador: [
    ...FUTEBOL_HUB,
    'futebol/futebol_cadastros__cad_jogadores',
    'futebol/futebol_cadastros__cad_categorias',
    'futebol/futebol_cadastros__cad_times',
    ...FUTEBOL_COMISSAO_LOGISTICA,
    'futebol/futebol_performance__futebol_performance_dash',
    'futebol/futebol_performance__futebol_fisiologista',
    'futebol/futebol_performance__futebol_preparacao_fisica',
    'futebol__futebol_fisiologia',
    'futebol_performance',
    'futebol_preparacao_fisica',
    'futebol_fisiologia',
    'player_tab__desempenho',
  ],
  roupeiro: [
    ...FUTEBOL_HUB,
    'futebol__futebol_comissao',
    'futebol_comissao',
    'futebol__futebol_logistica',
    'futebol_logistica',
    'futebol/futebol_logistica__futebol_logistica_viagens',
    'futebol/futebol_logistica__futebol_logistica_agenda',
    'adm__adm_estoque',
    'adm_estoque',
  ],
  compras: [...ADM_COMPRAS],
  rh: [...ADM_RH],
  financeiro: [...ADM_FINANCEIRO],
  ceo: [...ADM_CEO],
  marketing: [...MARKETING_FULL],
};

async function applyRoleDefaults(roleSlug: string, slugs: readonly string[]) {
  const uniqueSlugs = [...new Set(slugs)];
  const modules = await prisma.module.findMany({
    where: { slug: { in: uniqueSlugs } },
    select: { id: true, slug: true },
  });
  const found = new Set(modules.map((m) => m.slug));
  const missing = uniqueSlugs.filter((s) => !found.has(s));
  if (missing.length) {
    console.warn(`  [${roleSlug}] slugs não encontrados no banco (${missing.length}):`, missing.join(', '));
  }

  let granted = 0;
  for (const mod of modules) {
    const existing = await prisma.moduleRole.findUnique({
      where: { moduleId_role: { moduleId: mod.id, role: roleSlug } },
    });
    if (existing?.canAccess) continue;

    if (DRY_RUN) {
      console.log(`  [dry-run] ${roleSlug} ← ${mod.slug}`);
      granted++;
      continue;
    }

    await prisma.moduleRole.upsert({
      where: { moduleId_role: { moduleId: mod.id, role: roleSlug } },
      create: { moduleId: mod.id, role: roleSlug, canAccess: true },
      update: { canAccess: true },
    });
    granted++;
  }
  console.log(`  ${roleSlug}: ${granted} permissão(ões) ligada(s)`);
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== Aplicando acessos padrão (roles novos) ===');

  for (const slug of Object.keys(NEW_ROLE_DEFAULTS)) {
    const role = await prisma.platformRole.findUnique({ where: { slug } });
    if (!role) {
      console.warn(`  perfil "${slug}" não existe — pulando`);
      continue;
    }
    await applyRoleDefaults(slug, NEW_ROLE_DEFAULTS[slug]);
  }

  console.log('Concluído.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
