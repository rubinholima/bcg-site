/**
 * Labels do dashboard com acentuação correta.
 * Usa escape Unicode para garantir exibição correta em qualquer encoding.
 */
/** Primeiro item do menu de cada departamento (antes "Visão geral"). */
export const DEPT_HUB_MENU_LABEL = "Dash";

export const DASHBOARD_LABELS = {
  usuarios: "Usu\u00E1rios",       // á
  paginas: "P\u00E1ginas",        // á
  noticias: "Not\u00EDcias",     // í
  midia: "M\u00EDdia",           // í
  configuracoes: "Configura\u00E7\u00F5es", // ç + õ
  estadios: "Est\u00E1dios",     // á
  timesAdversarios: "Times advers\u00E1rios", // á
  atletas: "Atletas",            // termo profissional (antes "Jogadores")
} as const;

/**
 * Nomes exibidos dos módulos (tabela Permissões dos Módulos).
 * Mapeia slug -> nome com acentuação correta (evita mojibake no servidor).
 */
export const MODULE_DISPLAY_NAMES: Record<string, string> = {
  dashboard: "Dashboard",
  grupo_master: "Grupo Master",
  usuarios: "Usu\u00E1rios",
  empresas: "Empresas",
  tipos: "Tipos",
  emails: "Emails",
  paginas: "P\u00E1ginas",
  noticias: "Not\u00EDcias",
  midia: "M\u00EDdia",
  configuracoes: "Configura\u00E7\u00F5es",
  vault: "Senhas / Vault (ver)",
  vault_manage: "Senhas / Vault (gerenciar)",
  vault_reveal: "Senhas / Vault (revelar/copiar)",
  vault_export: "Senhas / Vault (exportar)",
  saude: "Saúde (equipe m\u00E9dica e psicol\u00F3gica)",
  psicologia: "Psicologia — legado auditoria",
  medico: "M\u00E9dico — legado auditoria",
  diretoria: "Diretoria (avalia\u00E7\u00F5es e status)",
  analista: "Analista",
  juridico: "Controle Jurídico",
  futebol_logistica: "Log\u00EDstica",
  marketing: "Marketing (Planner)",
  boston_tv: "BCG TV",
  academias: "Academias (gest\u00E3o e portal do aluno)",
  adm_financeiro: "Financeiro",
  adm_compras: "Compras",
  adm_ti: "TI — Atendimento",
  requisicoes: "Requisições",
  adm_estoque: "Estoque",
  adm_rh: "RH",
  adm_patrimonio: "Patrim\u00F4nio",
  adm_nutricao: "Nutri\u00E7\u00E3o",
  futebol_comissao: "Comiss\u00E3o t\u00E9cnica",
  futebol_fisiologia: "Fisiologia",
  futebol_analise: "An\u00E1lise / desempenho",
  relatorios: "Relat\u00F3rios",
  socio_torcedor: "S\u00F3cio torcedor",
  eventos: "Eventos",
  integracoes: "Integra\u00E7\u00F5es",
  fmf_scraper: "Importação FMF",
};
