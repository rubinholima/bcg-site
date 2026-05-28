/** Categorias de jogos (Sub-9 até Sub-20, Principal, Feminino) */
export const FIXTURE_CATEGORIES = [
  { value: "principal", labelPT: "Principal", labelEN: "First Team" },
  { value: "modulo_ii", labelPT: "Módulo II", labelEN: "Module II" },
  { value: "sub20", labelPT: "Sub-20", labelEN: "U-20" },
  { value: "sub17", labelPT: "Sub-17", labelEN: "U-17" },
  { value: "sub15", labelPT: "Sub-15", labelEN: "U-15" },
  { value: "sub14", labelPT: "Sub-14", labelEN: "U-14" },
  { value: "sub13", labelPT: "Sub-13", labelEN: "U-13" },
  { value: "sub11", labelPT: "Sub-11", labelEN: "U-11" },
  { value: "sub9", labelPT: "Sub-9", labelEN: "U-9" },
  { value: "feminino", labelPT: "Feminino", labelEN: "Women's" },
] as const;

export type FixtureCategoryValue = (typeof FIXTURE_CATEGORIES)[number]["value"];

export function getCategoryLabel(value: string, lang: "pt" | "en"): string {
  const cat = FIXTURE_CATEGORIES.find((c) => c.value === value);
  return cat ? (lang === "pt" ? cat.labelPT : cat.labelEN) : value;
}
