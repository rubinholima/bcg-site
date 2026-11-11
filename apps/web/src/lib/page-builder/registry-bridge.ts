import {
  BUILDER_BLOCK_REGISTRY,
  getBlockDefinition,
  type BuilderModuleCategory,
} from "@bcg/page-builder-core";
import type { HomeBlockType } from "@/types/home-content";
import type { ModuleCategory } from "@/lib/home-content";

/** Tipos adicionais (futebol 2.0) — também no registry após extensão. */
export const EXTENDED_BLOCK_TYPES = [
  "match_day_hero",
  "countdown_block",
  "match_center",
  "technical_staff_public",
  "stadium_public",
  "honors_block",
  "membership_public",
  "statistics_public",
  "video_block",
  "social_links_block",
] as const;

export type ExtendedBlockType = (typeof EXTENDED_BLOCK_TYPES)[number];

export function isCanonicalBlockType(type: string): boolean {
  return !!getBlockDefinition(type) || (EXTENDED_BLOCK_TYPES as readonly string[]).includes(type);
}

export function buildModuleOptionsFromRegistry(): {
  type: HomeBlockType;
  label: string;
  category: ModuleCategory;
}[] {
  const categoryMap: Record<BuilderModuleCategory, ModuleCategory> = {
    geral: "geral",
    futebol: "futebol",
    empresas: "empresas",
    imobiliaria: "imobiliaria",
    eventos: "eventos",
  };
  const fromRegistry = BUILDER_BLOCK_REGISTRY.map((def) => ({
    type: def.type as HomeBlockType,
    label: def.labelPt,
    category: categoryMap[def.category],
  }));
  const extraLabels: Record<ExtendedBlockType, { pt: string; cat: ModuleCategory }> = {
    match_day_hero: { pt: "Match Day Hero", cat: "futebol" },
    countdown_block: { pt: "Contagem regressiva", cat: "futebol" },
    match_center: { pt: "Match Center", cat: "futebol" },
    technical_staff_public: { pt: "Comissão técnica", cat: "futebol" },
    stadium_public: { pt: "Estádio", cat: "futebol" },
    honors_block: { pt: "Títulos / Troféus", cat: "futebol" },
    membership_public: { pt: "Sócio torcedor", cat: "futebol" },
    statistics_public: { pt: "Estatísticas públicas", cat: "futebol" },
    video_block: { pt: "Vídeo", cat: "geral" },
    social_links_block: { pt: "Redes sociais", cat: "geral" },
  };
  const extras = EXTENDED_BLOCK_TYPES.map((type) => ({
    type: type as HomeBlockType,
    label: extraLabels[type].pt,
    category: extraLabels[type].cat,
  }));
  return [...fromRegistry, ...extras];
}

export function getRegistryBlockLabel(
  id: string,
  type: string,
  lang: "pt" | "en",
): string | undefined {
  const def = getBlockDefinition(type);
  if (def) return lang === "pt" ? def.labelPt : def.labelEn;
  const ext = EXTENDED_BLOCK_TYPES.find((t) => t === type);
  if (ext) {
    const built = buildModuleOptionsFromRegistry().find((o) => o.type === ext);
    return built?.label;
  }
  return undefined;
}
