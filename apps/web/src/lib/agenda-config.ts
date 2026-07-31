import { api } from "@/lib/api";

export type AgendaAreaRow = {
  id: string;
  slug: string;
  label: string;
  dataSource: string;
  moduleSlug: string | null;
  isPublic: boolean;
  manageHref: string;
  createHref: string | null;
  sortOrder: number;
  active: boolean;
  isSystem?: boolean;
};

export type AgendaEventCategoryRow = {
  id: string;
  slug: string;
  label: string;
  areaSlug: string | null;
  eventType: string | null;
  matchSide: string | null;
  bgColor: string;
  textColor: string;
  borderColor: string;
  sortOrder: number;
  active: boolean;
  isSystem?: boolean;
};

export type AgendaConfigPayload = {
  areas: AgendaAreaRow[];
  categories: AgendaEventCategoryRow[];
};

export type AgendaColorSwatch = {
  bg: string;
  text: string;
  border: string;
};

export type AgendaDataSource = "futebol" | "consultas" | "boston-hall" | "marketing";

let cachedConfig: AgendaConfigPayload | null = null;
let cacheAt = 0;
const CACHE_MS = 60_000;

export async function fetchAgendaConfig(force = false): Promise<AgendaConfigPayload> {
  if (!force && cachedConfig && Date.now() - cacheAt < CACHE_MS) {
    return cachedConfig;
  }
  const { data } = await api.get<AgendaConfigPayload>("/agenda-config");
  cachedConfig = {
    areas: Array.isArray(data?.areas) ? data.areas : [],
    categories: Array.isArray(data?.categories) ? data.categories : [],
  };
  cacheAt = Date.now();
  return cachedConfig;
}

export function invalidateAgendaConfigCache() {
  cachedConfig = null;
  cacheAt = 0;
}

/** Resolve categoria de cor por tipo de evento — NUNCA por elenco/categoria de jogo. */
export function resolveAgendaCategorySlug(input: {
  areaSlug: string;
  eventType?: string | null;
  matchSide?: "casa" | "fora" | null;
}): string {
  const { areaSlug, eventType, matchSide } = input;
  const type = eventType ?? "outro";

  if (areaSlug === "futebol") {
    if (type === "aniversario") return "aniversario";
    if (type === "viagem" || matchSide === "fora") return "viagem";
    if (type === "jogo" && matchSide === "casa") return "jogo-casa";
    if (type === "jogo") return "jogo";
    if (type in { treino: 1, reuniao: 1, compromisso: 1, preparacao: 1, palco: 1, outro: 1 }) {
      return type;
    }
    return "outro";
  }
  if (areaSlug === "psicologia") return "consulta-psicologia";
  if (areaSlug === "boston-hall") return "reserva-boston-hall";
  if (areaSlug === "marketing") return "publicacao-marketing";
  return "outro";
}

export function findAgendaCategory(
  categories: AgendaEventCategoryRow[],
  categorySlug: string,
): AgendaEventCategoryRow | undefined {
  return categories.find((c) => c.slug === categorySlug && c.active);
}

export function categoryToSwatch(cat: AgendaEventCategoryRow): AgendaColorSwatch {
  return { bg: cat.bgColor, text: cat.textColor, border: cat.borderColor };
}

export function categoryPillStyle(cat: AgendaEventCategoryRow | undefined): AgendaColorSwatch {
  if (!cat) {
    return { bg: "#52525b", text: "#ffffff", border: "#a1a1aa" };
  }
  return categoryToSwatch(cat);
}

export function swatchToStyle(sw: AgendaColorSwatch): {
  backgroundColor: string;
  color: string;
  borderColor: string;
} {
  return {
    backgroundColor: sw.bg,
    color: sw.text,
    borderColor: sw.border,
  };
}

export function buildPermissionsFromAreas(areas: AgendaAreaRow[]): Record<AgendaDataSource, boolean> {
  const slugs = new Set(areas.map((a) => a.dataSource));
  return {
    futebol: slugs.has("futebol"),
    "boston-hall": slugs.has("boston-hall"),
    consultas: slugs.has("consultas"),
    marketing: slugs.has("marketing"),
  };
}

export function areaByDataSource(areas: AgendaAreaRow[], dataSource: AgendaDataSource): AgendaAreaRow | undefined {
  return areas.find((a) => a.dataSource === dataSource);
}

/** Converte config DB para mapa usado pela agenda operacional de futebol (legado). */
export function categoriesToLegacyColorMap(
  categories: AgendaEventCategoryRow[],
): Record<string, AgendaColorSwatch> {
  const map: Record<string, AgendaColorSwatch> = {};
  for (const c of categories) {
    if (!c.eventType || c.areaSlug) continue;
    const key =
      c.slug === "jogo-casa"
        ? "casa"
        : c.slug === "jogo-fora" || c.slug === "viagem"
          ? "fora"
          : c.eventType;
    map[key] = categoryToSwatch(c);
  }
  return map;
}
