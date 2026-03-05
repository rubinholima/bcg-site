/**
 * Labels do dashboard com acentuação correta.
 * Usa escape Unicode para garantir exibição correta em qualquer encoding.
 */
export const DASHBOARD_LABELS = {
  usuarios: "Usu\u00E1rios",       // á
  paginas: "P\u00E1ginas",        // á
  noticias: "Not\u00EDcias",     // í
  midia: "M\u00EDdia",           // í
  configuracoes: "Configura\u00E7\u00F5es", // ç + õ
  estadios: "Est\u00E1dios",     // á
  timesAdversarios: "Times advers\u00E1rios", // á
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
  psicologia: "Psicologia (avalia\u00E7\u00E3o + consultas)",
  medico: "M\u00E9dico (hist\u00F3rico m\u00E9dico)",
  diretoria: "Diretoria (avalia\u00E7\u00F5es e status)",
  analista: "Analista",
  juridico: "Controle Jurídico",
};
