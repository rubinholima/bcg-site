import type { PlayerDossierOptionalSection } from "@/lib/player-dossier.types";

export const PLAYER_DOSSIER_OPTIONAL_LABELS: Record<PlayerDossierOptionalSection, string> = {
  psychology: "Psicologia e consultas",
  physio: "Fisioterapia",
  nursing: "Enfermaria",
  medical: "Saídas médicas e histórico clínico",
  nutrition: "Nutrição",
  physiology: "Fisiologia",
  performance: "Desempenho analítico",
  scouting: "Captação / scouting",
  training: "Treinos",
};

/** Apenas Gerente e Diretoria podem escolher seções sensíveis. Gestor/Supervisor: negado. */
export function canChooseSensitiveDossierSections(role: string | null | undefined): boolean {
  if (!role) return false;
  const normalized = role.trim().toLowerCase();
  return normalized === "gerente" || normalized === "diretoria";
}

export function hasModuleAccess(
  moduleSlugs: readonly string[],
  required: string | readonly string[],
): boolean {
  const needed = Array.isArray(required) ? required : [required];
  return needed.some((slug) => moduleSlugs.includes(slug));
}

const OPTIONAL_MODULE: Record<PlayerDossierOptionalSection, string | readonly string[]> = {
  psychology: "saude",
  physio: "saude",
  nursing: "saude",
  medical: "saude",
  nutrition: "adm_nutricao",
  physiology: "futebol_fisiologia",
  performance: "futebol_analise",
  scouting: "futebol_captacao",
  training: "futebol_treinadores",
};

function isDossierBypassRole(_role: string | null | undefined): boolean {
  return false;
}

export function listSelectableOptionalSections(
  role: string | null | undefined,
  moduleSlugs: readonly string[],
): PlayerDossierOptionalSection[] {
  if (!canChooseSensitiveDossierSections(role)) return [];
  if (isDossierBypassRole(role)) {
    return Object.keys(OPTIONAL_MODULE) as PlayerDossierOptionalSection[];
  }
  return (Object.keys(OPTIONAL_MODULE) as PlayerDossierOptionalSection[]).filter((section) =>
    hasModuleAccess(moduleSlugs, OPTIONAL_MODULE[section]),
  );
}
