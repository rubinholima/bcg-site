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
  futebol_logistica: "Log\u00EDstica (deslocamento)",
  marketing: "Marketing (Planner)",
  boston_tv: "Boston TV",
  academias: "Academias (gest\u00E3o e portal do aluno)",
};
