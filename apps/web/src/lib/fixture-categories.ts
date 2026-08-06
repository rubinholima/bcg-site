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

export function getCategoryLabel(
  value: string,
  lang: "pt" | "en",
  list?: readonly FixtureCategoryItem[],
): string {
  const source = list ?? FIXTURE_CATEGORIES_FALLBACK;
  const cat = source.find((c) => c.value === value);
  return cat ? (lang === "pt" ? cat.labelPT : cat.labelEN) : value;
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

/** Filtra pelo que o clube liberou em Empresas (Tenant.categories). */
export function filterCategoriesForTenant(
  all: readonly FixtureCategoryItem[],
  tenantCategories: string[] | null | undefined,
): FixtureCategoryItem[] {
  if (!tenantCategories?.length) return [...all];
  const set = new Set(
    tenantCategories.map((s) => s.trim().toLowerCase()).filter(Boolean),
  );
  return all.filter((c) => set.has(c.value.trim().toLowerCase()));
}
