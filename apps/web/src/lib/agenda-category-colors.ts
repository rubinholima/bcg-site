/** Cores estáveis por categoria (Sub-15, Principal, etc.) na agenda geral. */

export type AgendaCategorySwatch = {
  bg: string;
  text: string;
  border: string;
  dot: string;
  pill: string;
};

const CATEGORY_PALETTE: Omit<AgendaCategorySwatch, "pill">[] = [
  {
    bg: "#0d9488",
    text: "#ffffff",
    border: "#2dd4bf",
    dot: "bg-teal-500",
  },
  {
    bg: "#0284c7",
    text: "#ffffff",
    border: "#38bdf8",
    dot: "bg-sky-500",
  },
  {
    bg: "#7c3aed",
    text: "#ffffff",
    border: "#a78bfa",
    dot: "bg-violet-500",
  },
  {
    bg: "#db2777",
    text: "#ffffff",
    border: "#f472b6",
    dot: "bg-pink-500",
  },
  {
    bg: "#ea580c",
    text: "#ffffff",
    border: "#fb923c",
    dot: "bg-orange-500",
  },
  {
    bg: "#059669",
    text: "#ffffff",
    border: "#34d399",
    dot: "bg-emerald-500",
  },
  {
    bg: "#4f46e5",
    text: "#ffffff",
    border: "#818cf8",
    dot: "bg-indigo-500",
  },
  {
    bg: "#ca8a04",
    text: "#18181b",
    border: "#facc15",
    dot: "bg-yellow-500",
  },
  {
    bg: "#0891b2",
    text: "#ffffff",
    border: "#22d3ee",
    dot: "bg-cyan-500",
  },
  {
    bg: "#be185d",
    text: "#ffffff",
    border: "#f472b6",
    dot: "bg-rose-600",
  },
];

function hashCategory(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function resolveCategoryColorKey(
  category: string | null | undefined,
  categories?: string[] | null,
): string | null {
  const primary = category?.trim() || categories?.find((c) => c.trim())?.trim();
  return primary || null;
}

export function agendaCategorySwatch(categoryKey: string | null | undefined): AgendaCategorySwatch {
  if (!categoryKey) {
    return {
      bg: "#52525b",
      text: "#ffffff",
      border: "#a1a1aa",
      dot: "bg-zinc-400",
      pill: "bg-zinc-100 text-zinc-900 border-zinc-300 dark:bg-zinc-500/15 dark:text-zinc-100 dark:border-zinc-500/40",
    };
  }
  const base = CATEGORY_PALETTE[hashCategory(categoryKey) % CATEGORY_PALETTE.length];
  return {
    ...base,
    pill: "",
  };
}

export function agendaCategoryPillStyle(categoryKey: string | null | undefined): {
  backgroundColor: string;
  color: string;
  borderColor: string;
} {
  const sw = agendaCategorySwatch(categoryKey);
  return {
    backgroundColor: sw.bg,
    color: sw.text,
    borderColor: sw.border,
  };
}

export function agendaCategoryDotClass(categoryKey: string | null | undefined): string {
  return agendaCategorySwatch(categoryKey).dot;
}

/** Classes Tailwind para pills quando inline style não é usado. */
export function agendaCategoryPillClass(categoryKey: string | null | undefined): string {
  const sw = agendaCategorySwatch(categoryKey);
  if (sw.pill) return sw.pill;
  return "border";
}
