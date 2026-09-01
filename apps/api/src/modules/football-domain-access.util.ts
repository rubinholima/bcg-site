/**
 * Regra permanente CUP360 — gestão do domínio Futebol.
 *
 * Gestor/Gerente/Supervisor têm acesso a todos os módulos operacionais de Futebol.
 * Cup360: perfil GESTOR na planilha mapeia para slug `gerente` (mesmo que GERENTE).
 */
export const FOOTBALL_MANAGEMENT_ROLE_SLUGS = ['gerente', 'supervisor', 'gestor'] as const;

export type FootballManagementRoleSlug = (typeof FOOTBALL_MANAGEMENT_ROLE_SLUGS)[number];

export function isFootballManagementRole(role: string | null | undefined): boolean {
  if (!role) return false;
  const normalized = role.trim().toLowerCase();
  return (FOOTBALL_MANAGEMENT_ROLE_SLUGS as readonly string[]).includes(normalized);
}

/** Slugs globais que nunca entram no auto-grant de Futebol (outros domínios). */
const FOOTBALL_ACCESS_EXCLUDED_SLUGS = new Set([
  'dashboard',
  'dashboard__dashboard',
  'grupo_master',
  'empresas',
  'usuarios',
  'emails',
  'configuracoes',
  'vault',
  'vault_manage',
  'vault_reveal',
  'vault_export',
  'relatorios',
  'relatorios_adm',
  'relatorios_saude',
  'relatorios_marketing',
  'relatorios_juridico',
  'relatorios_eventos',
  'relatorios_grupo_master',
  'relatorios_socio_torcedor',
  'adm_visao',
  'adm_financeiro',
  'adm_compras',
  'adm_estoque',
  'adm_rh',
  'adm_patrimonio',
  'adm_nutricao',
  'adm_ti',
  'saude',
  'medico',
  'psicologia',
  'juridico',
  'marketing',
  'midia',
  'noticias',
  'paginas',
  'eventos',
  'socio_torcedor',
  'comunicacao',
  'infraestrutura',
  'requisicoes',
]);

function isAdmOrCrossDomainSlug(slug: string): boolean {
  if (FOOTBALL_ACCESS_EXCLUDED_SLUGS.has(slug)) return true;
  if (slug.startsWith('adm__') || slug.startsWith('adm/') || slug.startsWith('adm_')) return true;
  if (slug.startsWith('saude__') || slug.startsWith('saude/') || slug.startsWith('saude_')) return true;
  if (slug.startsWith('marketing__') || slug.startsWith('marketing/')) return true;
  if (slug.startsWith('configuracoes__')) return true;
  if (slug.startsWith('relatorios_') && slug !== 'relatorios_futebol') return true;
  return false;
}

/**
 * Módulo operacional do domínio Futebol (menu, API, abas de atleta ligadas ao dept).
 * Não inclui RH/Financeiro/ADM mesmo quando dados de atletas aparecem lá.
 */
export function isFootballOperationalModuleSlug(
  slug: string,
  functionalArea?: string | null,
): boolean {
  const s = slug.trim();
  if (!s || isAdmOrCrossDomainSlug(s)) return false;

  if (s === 'relatorios_futebol') return true;
  if (s === 'tipos') return true;
  if (s === 'futebol_assistencia_social' || s.startsWith('assistencia_social')) return true;
  if (/^futebol([/_]|__)/.test(s) || s.startsWith('futebol_')) return true;
  if (functionalArea === 'futebol_tecnico' || functionalArea === 'futebol_cadastro') return true;
  if (s === 'agenda' || s === 'agenda__agenda') return true;
  if (s === 'player_tab__desempenho' || s === 'player_tab__status') return true;
  if (s === 'player_tab__assistencia_social') return true;
  if (s === 'diretoria') return true;

  return false;
}
