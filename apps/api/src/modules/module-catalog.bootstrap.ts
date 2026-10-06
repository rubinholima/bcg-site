import type { ModuleCatalogEntry } from './modules.service';

/** Módulos canônicos (API + menu) — deny-by-default até função/usuário. */
export const CUP360_MODULE_CATALOG_BOOTSTRAP: ModuleCatalogEntry[] = [
  { slug: 'dashboard', name: 'Dashboard', sortOrder: 0, functionalArea: 'estrategico' },
  { slug: 'medico', name: 'Prontuário / Médico', sortOrder: 9985, functionalArea: 'saude_dados_sensiveis' },
  { slug: 'cad_jogadores_negociados', name: 'Atletas negociados', sortOrder: 9980, functionalArea: 'futebol_dados_sensiveis' },
  { slug: 'futebol_tryouts', name: 'Try Out', sortOrder: 36, functionalArea: 'futebol_tecnico' },
  { slug: 'futebol_captacao', name: 'Captação', sortOrder: 35, functionalArea: 'futebol_tecnico' },
  { slug: 'futebol_preparacao_fisica', name: 'Preparação física', sortOrder: 37, functionalArea: 'futebol_tecnico' },
  { slug: 'futebol_treinador_goleiros', name: 'Treinador de goleiros', sortOrder: 38, functionalArea: 'futebol_tecnico' },
  { slug: 'futebol_treinadores', name: 'Treinadores', sortOrder: 34, functionalArea: 'futebol_tecnico', impliesSlug: 'relatorios_futebol' },
  { slug: 'relatorios_futebol', name: 'Relatórios futebol', sortOrder: 200, functionalArea: 'futebol_tecnico' },
  {
    slug: 'futebol_logistica_uniformes',
    name: 'Gestão de uniformes',
    sortOrder: 201,
    functionalArea: 'futebol_tecnico',
  },
  { slug: 'configuracoes', name: 'Configurações', sortOrder: 9990, functionalArea: 'empresa_usuarios' },
  { slug: 'usuarios', name: 'Usuários', sortOrder: 9991, functionalArea: 'empresa_usuarios' },
];
