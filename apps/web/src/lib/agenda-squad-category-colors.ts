/** Cores do elenco (Sub-15, Sub-17…) na agenda — localStorage, editáveis pelo usuário. */

export const AGENDA_SQUAD_COLOR_PREF_KEY = "bcg-agenda-squad-category-colors-v1";

export type SquadCategoryColor = {
  bg: string;
  text: string;
};

/** Padrões distintos por categoria de elenco. */
export const DEFAULT_SQUAD_CATEGORY_COLORS: Record<string, SquadCategoryColor> = {
  principal: { bg: "#dc2626", text: "#ffffff" },
  modulo_ii: { bg: "#ea580c", text: "#ffffff" },
  sub20: { bg: "#7c3aed", text: "#ffffff" },
  sub17: { bg: "#4f46e5", text: "#ffffff" },
  sub15: { bg: "#0284c7", text: "#ffffff" },
  sub14: { bg: "#0891b2", text: "#ffffff" },
  sub13: { bg: "#0d9488", text: "#ffffff" },
  sub11: { bg: "#16a34a", text: "#ffffff" },
  sub9: { bg: "#65a30d", text: "#ffffff" },
  feminino: { bg: "#db2777", text: "#ffffff" },
};

export const FALLBACK_SQUAD_COLOR: SquadCategoryColor = {
  bg: "#71717a",
  text: "#ffffff",
};

function isHex(v: unknown): v is string {
  return typeof v === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim());
}

export function loadSquadCategoryColors(): Record<string, SquadCategoryColor> {
  const base = { ...DEFAULT_SQUAD_CATEGORY_COLORS };
  if (typeof window === "undefined") return base;
  try {
    const raw = localStorage.getItem(AGENDA_SQUAD_COLOR_PREF_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Record<string, Partial<SquadCategoryColor>>;
    for (const [key, sw] of Object.entries(parsed)) {
      if (!key || !sw) continue;
      const def = DEFAULT_SQUAD_CATEGORY_COLORS[key] ?? FALLBACK_SQUAD_COLOR;
      base[key] = {
        bg: isHex(sw.bg) ? sw.bg : def.bg,
        text: isHex(sw.text) ? sw.text : def.text,
      };
    }
    return base;
  } catch {
    return base;
  }
}

export function saveSquadCategoryColors(colors: Record<string, SquadCategoryColor>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AGENDA_SQUAD_COLOR_PREF_KEY, JSON.stringify(colors));
}

export function resolveSquadCategoryColor(
  colors: Record<string, SquadCategoryColor>,
  categoryValue: string | null | undefined,
): SquadCategoryColor | null {
  if (!categoryValue?.trim()) return null;
  const key = categoryValue.trim();
  return colors[key] ?? DEFAULT_SQUAD_CATEGORY_COLORS[key] ?? FALLBACK_SQUAD_COLOR;
}
