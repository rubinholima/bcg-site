/**
 * Modelos prontos (presets) aditivos: só ligam células (true);
 * não removem permissões já concedidas. Persistir via PATCH na API.
 */

export const MANAGED_ROLES = [
  "company_admin",
  "editor",
  "gerente",
  "administrativo",
  "analista",
  "diretoria",
  "medico",
  "psicologo",
] as const;

export type ManagedRoleKey = (typeof MANAGED_ROLES)[number];

export interface ModulePermissionRow {
  slug: string;
  name: string;
  sortOrder: number;
  functionalArea?: string;
  company_admin: boolean;
  editor: boolean;
  gerente: boolean;
  administrativo: boolean;
  analista: boolean;
  diretoria: boolean;
  medico: boolean;
  psicologo: boolean;
}

export interface PresetGrant {
  role: ManagedRoleKey;
  slug: string;
}

export interface PermissionPreset {
  id: string;
  title: string;
  description: string;
  grants: readonly PresetGrant[];
}

/** Modelos institucionais — alinhados aos slugs do banco (`Module.slug`). */
export const PERMISSION_PRESETS: readonly PermissionPreset[] = [
  {
    id: "conteudo-midia-equipe-editorial",
    title: "Conteúdo e mídia (editor)",
    description:
      "Páginas, notícias, mídia, eventos, marketing (Planner) e Boston TV — equipe típica de comunicação.",
    grants: [
      { role: "editor", slug: "paginas" },
      { role: "editor", slug: "noticias" },
      { role: "editor", slug: "midia" },
      { role: "editor", slug: "eventos" },
      { role: "editor", slug: "marketing" },
      { role: "editor", slug: "boston_tv" },
      { role: "company_admin", slug: "paginas" },
      { role: "company_admin", slug: "noticias" },
      { role: "company_admin", slug: "midia" },
      { role: "company_admin", slug: "eventos" },
      { role: "company_admin", slug: "marketing" },
      { role: "company_admin", slug: "boston_tv" },
    ],
  },
  {
    id: "operacao-diaria-administracao",
    title: "Operação administrativa típica (Company Admin + Editor)",
    description:
      "Dashboard, empresa, cadastros-base, e-mail e configurações leves do dia a dia.",
    grants: [
      { role: "company_admin", slug: "dashboard" },
      { role: "company_admin", slug: "empresas" },
      { role: "company_admin", slug: "usuarios" },
      { role: "company_admin", slug: "tipos" },
      { role: "company_admin", slug: "emails" },
      { role: "company_admin", slug: "configuracoes" },
      { role: "editor", slug: "dashboard" },
      { role: "editor", slug: "tipos" },
      { role: "editor", slug: "emails" },
    ],
  },
  {
    id: "futebol-tecnico-quadro-tecnico",
    title: "Futebol — quadro técnico e métricas",
    description: "Comissão, fisiologia, desempenho e logística — sem dados clínicos sensíveis.",
    grants: [
      { role: "editor", slug: "futebol_comissao" },
      { role: "editor", slug: "futebol_fisiologia" },
      { role: "editor", slug: "futebol_analise" },
      { role: "editor", slug: "futebol_logistica" },
      { role: "company_admin", slug: "futebol_comissao" },
      { role: "company_admin", slug: "futebol_fisiologia" },
      { role: "company_admin", slug: "futebol_analise" },
      { role: "company_admin", slug: "futebol_logistica" },
      { role: "analista", slug: "futebol_analise" },
    ],
  },
  {
    id: "saude-comportamento-lgpd",
    title: "Saúde & dados sensíveis (LGPD)",
    description:
      "Médico, psicologia, diretoria e jurídico — habilitar só para pessoas credenciadas.",
    grants: [
      { role: "medico", slug: "saude" },
      { role: "psicologo", slug: "saude" },
      { role: "company_admin", slug: "saude" },
      { role: "diretoria", slug: "diretoria" },
      { role: "company_admin", slug: "diretoria" },
      { role: "editor", slug: "juridico" },
      { role: "diretoria", slug: "juridico" },
    ],
  },
  {
    id: "adm-financeiro-operacoes",
    title: "Administrativo & financeiro (Omie / estoque)",
    description: "Financeiro, compras, estoque, RH, patrimônio e nutrição.",
    grants: [
      { role: "company_admin", slug: "adm_financeiro" },
      { role: "company_admin", slug: "adm_compras" },
      { role: "company_admin", slug: "adm_estoque" },
      { role: "company_admin", slug: "adm_rh" },
      { role: "company_admin", slug: "adm_patrimonio" },
      { role: "company_admin", slug: "adm_nutricao" },
      { role: "editor", slug: "adm_financeiro" },
      { role: "editor", slug: "adm_compras" },
      { role: "editor", slug: "adm_estoque" },
    ],
  },
];

export function getPresetById(id: string): PermissionPreset | undefined {
  return PERMISSION_PRESETS.find((p) => p.id === id);
}

/**
 * Aplica grants do preset de forma aditiva (só marca true).
 * Cobre apenas slugs presentes em `displayRows` (matriz atual da UI).
 */
export function applyAdditivePreset(
  displayRows: readonly { slug: string; sortOrder: number; functionalArea: string; name?: string }[],
  current: ModulePermissionRow[],
  grants: readonly PresetGrant[],
): ModulePermissionRow[] {
  const base = (slug: string) => current.find((m) => m.slug === slug);

  const out: ModulePermissionRow[] = displayRows.map((d) => {
    const b = base(d.slug);
    return {
      slug: d.slug,
      name: b?.name ?? d.name ?? d.slug,
      sortOrder: d.sortOrder,
      functionalArea: d.functionalArea,
      company_admin: b?.company_admin ?? false,
      editor: b?.editor ?? false,
      gerente: b?.gerente ?? false,
      administrativo: b?.administrativo ?? false,
      analista: b?.analista ?? false,
      diretoria: b?.diretoria ?? false,
      medico: b?.medico ?? false,
      psicologo: b?.psicologo ?? false,
    };
  });

  const bySlug = new Map(out.map((m) => [m.slug, m]));
  for (const g of grants) {
    const row = bySlug.get(g.slug);
    if (!row) continue;
    (row as unknown as Record<string, boolean>)[g.role] = true;
  }

  return out.sort((a, b) => a.sortOrder - b.sortOrder);
}

const EXPORT_SCHEMA_VERSION = 2 as const;

export function buildMatrixExportPayload(rows: ModulePermissionRow[]): {
  schemaVersion: typeof EXPORT_SCHEMA_VERSION;
  exportedAt: string;
  permissions: Record<string, Record<string, boolean>>;
} {
  const permissions: Record<string, Record<string, boolean>> = {};
  for (const m of rows) {
    permissions[m.slug] = {
      company_admin: m.company_admin,
      editor: m.editor,
      gerente: m.gerente,
      administrativo: m.administrativo,
      analista: m.analista,
      diretoria: m.diretoria,
      medico: m.medico,
      psicologo: m.psicologo,
    };
  }
  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    permissions,
  };
}
