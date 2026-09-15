import { api } from "@/lib/api";

/** Item de categoria — cadastro central (API) ou fallback estático */
export type FixtureCategoryItem = {
  id?: string;
  value: string;
  labelPT: string;
  labelEN: string;
  sortOrder?: number;
  active?: boolean;
};

/** Fallback offline / antes da migration */
export const FIXTURE_CATEGORIES_FALLBACK: readonly FixtureCategoryItem[] = [
  { value: "principal", labelPT: "Principal", labelEN: "First Team" },
  { value: "modulo_ii", labelPT: "Módulo II", labelEN: "Module II" },
  { value: "sub20", labelPT: "Sub-20", labelEN: "U-20" },
  { value: "sub17", labelPT: "Sub-17", labelEN: "U-17" },
  { value: "sub15", labelPT: "Sub-15", labelEN: "U-15" },
  { value: "sub14", labelPT: "Sub-14", labelEN: "U-14" },
  { value: "sub13", labelPT: "Sub-13", labelEN: "U-13" },
  { value: "sub12", labelPT: "Sub-12", labelEN: "U-12" },
  { value: "sub11", labelPT: "Sub-11", labelEN: "U-11" },
  { value: "sub9", labelPT: "Sub-9", labelEN: "U-9" },
  { value: "feminino", labelPT: "Feminino", labelEN: "Women's" },
] as const;

/** @deprecated Use fetchFixtureCategories() ou useFixtureCategories() — mantido para compatibilidade */
export const FIXTURE_CATEGORIES = FIXTURE_CATEGORIES_FALLBACK;

export type FixtureCategoryValue = (typeof FIXTURE_CATEGORIES_FALLBACK)[number]["value"];

export function mapApiFixtureCategory(row: {
  id?: string;
  value: string;
  labelPT: string;
  labelEN: string;
  sortOrder?: number;
  active?: boolean;
}): FixtureCategoryItem {
  return {
    id: row.id,
    value: row.value,
    labelPT: row.labelPT,
    labelEN: row.labelEN,
    sortOrder: row.sortOrder,
    active: row.active,
  };
}

function catalogByValue(all: readonly FixtureCategoryItem[]): Map<string, FixtureCategoryItem> {
  return new Map(all.map((c) => [c.value.trim().toLowerCase(), c]));
}

/** Categoria operacional do elenco — sub15_2div → sub15; competição fica fora do selector. */
export function toOperationalCategoryKey(key: string): string {
  const normalized = key.trim().toLowerCase();
  if (!normalized) return "";
  if (normalized.endsWith("_2div")) return normalized.slice(0, -"_2div".length);
  return normalized;
}

export function getCategoryLabel(
  value: string,
  lang: "pt" | "en",
  list?: readonly FixtureCategoryItem[],
): string {
  const source = list ?? FIXTURE_CATEGORIES_FALLBACK;
  const normalized = value.trim().toLowerCase();
  const cat = source.find((c) => c.value.trim().toLowerCase() === normalized);
  const operational = toOperationalCategoryKey(value);
  const opCat = source.find((c) => c.value.trim().toLowerCase() === operational);
  if (opCat) return lang === "pt" ? opCat.labelPT : opCat.labelEN;
  return operational || value;
}

/** Categorias ativas do cadastro central (server components). */
export async function fetchFixtureCategories(options?: {
  activeOnly?: boolean;
}): Promise<FixtureCategoryItem[]> {
  try {
    const q = options?.activeOnly === false ? "" : "?active=1";
    const { data } = await api.get<
      Array<{ id: string; value: string; labelPT: string; labelEN: string; sortOrder?: number; active?: boolean }>
    >(`/fixture-categories${q}`);
    const list = Array.isArray(data) ? data.map(mapApiFixtureCategory) : [];
    return list.length > 0 ? list : [...FIXTURE_CATEGORIES_FALLBACK];
  } catch {
    return [...FIXTURE_CATEGORIES_FALLBACK];
  }
}

/**
 * Opções de filtro/cadastro a partir das categorias operacionais liberadas em Empresas.
 * Chaves legadas (*_2div) colapsam para sub20/sub15/sub13 — divisão não é categoria de elenco.
 */
export function filterCategoriesForTenant(
  all: readonly FixtureCategoryItem[],
  tenantCategories: string[] | null | undefined,
): FixtureCategoryItem[] {
  if (!tenantCategories?.length) return [...all];

  const seen = new Set<string>();
  const items: FixtureCategoryItem[] = [];

  for (const raw of tenantCategories) {
    const operational = toOperationalCategoryKey(raw);
    if (!operational || seen.has(operational)) continue;
    seen.add(operational);

    const exact = all.find((c) => c.value.trim().toLowerCase() === operational);
    if (exact) {
      items.push({ ...exact });
      continue;
    }
    items.push({
      value: operational,
      labelPT: operational,
      labelEN: operational,
    });
  }

  return items.sort((a, b) => {
    const ao = a.sortOrder ?? 999;
    const bo = b.sortOrder ?? 999;
    if (ao !== bo) return ao - bo;
    return a.labelPT.localeCompare(b.labelPT, "pt-BR");
  });
}
