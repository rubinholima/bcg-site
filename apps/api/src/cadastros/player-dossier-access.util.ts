/** Seções opcionais sensíveis/internas — OFF por padrão; só gerente/diretoria podem escolher. */
export const PLAYER_DOSSIER_OPTIONAL_SECTIONS = [
  'psychology',
  'physio',
  'nursing',
  'medical',
  'nutrition',
  'physiology',
  'performance',
  'scouting',
  'training',
] as const;

export type PlayerDossierOptionalSection = (typeof PLAYER_DOSSIER_OPTIONAL_SECTIONS)[number];

/** Módulo canônico exigido para incluir cada seção opcional (RBAC existente). */
export const PLAYER_DOSSIER_OPTIONAL_MODULE: Record<
  PlayerDossierOptionalSection,
  string | readonly string[]
> = {
  psychology: 'saude',
  physio: 'saude',
  nursing: 'saude',
  medical: 'saude',
  nutrition: 'adm_nutricao',
  physiology: 'futebol_fisiologia',
  performance: 'futebol_analise',
  scouting: 'futebol_captacao',
  training: 'futebol_treinadores',
};

export const PLAYER_DOSSIER_OPTIONAL_LABELS: Record<PlayerDossierOptionalSection, string> = {
  psychology: 'Psicologia e consultas',
  physio: 'Fisioterapia',
  nursing: 'Enfermaria',
  medical: 'Saídas médicas e histórico clínico',
  nutrition: 'Nutrição',
  physiology: 'Fisiologia',
  performance: 'Desempenho analítico',
  scouting: 'Captação / scouting',
  training: 'Treinos',
};

/**
 * Apenas Gerente e Diretoria podem escolher seções sensíveis.
 * Gestor e Supervisor NÃO — mesmo com auto-grant de Futebol.
 */
export function canChooseSensitiveDossierSections(role: string | null | undefined): boolean {
  if (!role) return false;
  const normalized = role.trim().toLowerCase();
  return (
    normalized === 'gerente' ||
    normalized === 'diretoria' ||
    normalized === 'super_admin' ||
    normalized === 'company_admin'
  );
}

export function hasModuleAccess(
  moduleSlugs: readonly string[],
  required: string | readonly string[],
): boolean {
  const needed = Array.isArray(required) ? required : [required];
  return needed.some((slug) => moduleSlugs.includes(slug));
}

function isDossierBypassRole(role: string | null | undefined): boolean {
  if (!role) return false;
  const normalized = role.trim().toLowerCase();
  return normalized === 'super_admin' || normalized === 'company_admin';
}

export function listAvailableOptionalSections(
  moduleSlugs: readonly string[],
  role?: string | null,
): PlayerDossierOptionalSection[] {
  if (isDossierBypassRole(role)) return [...PLAYER_DOSSIER_OPTIONAL_SECTIONS];
  return PLAYER_DOSSIER_OPTIONAL_SECTIONS.filter((section) =>
    hasModuleAccess(moduleSlugs, PLAYER_DOSSIER_OPTIONAL_MODULE[section]),
  );
}

export function parseOptionalSectionsQuery(raw?: string | null): PlayerDossierOptionalSection[] {
  if (!raw?.trim()) return [];
  const tokens = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const allowed = new Set<string>(PLAYER_DOSSIER_OPTIONAL_SECTIONS);
  return tokens.filter((t): t is PlayerDossierOptionalSection => allowed.has(t));
}

export function resolveIncludedOptionalSections(input: {
  role: string;
  moduleSlugs: readonly string[];
  requested: readonly string[];
}): PlayerDossierOptionalSection[] {
  if (!canChooseSensitiveDossierSections(input.role)) return [];
  const available = new Set(listAvailableOptionalSections(input.moduleSlugs, input.role));
  return input.requested.filter(
    (s): s is PlayerDossierOptionalSection =>
      (PLAYER_DOSSIER_OPTIONAL_SECTIONS as readonly string[]).includes(s) && available.has(s as PlayerDossierOptionalSection),
  );
}
