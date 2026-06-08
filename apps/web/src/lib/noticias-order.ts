import type { NoticiasItem } from "@/types/home-content";

export type NoticiasOrderMode = "feed" | "destaque_aleatorio";

export function normalizeNoticiasOrderMode(raw: unknown): NoticiasOrderMode {
  return raw === "feed" ? "feed" : "destaque_aleatorio";
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sortByDateDesc(items: NoticiasItem[]): NoticiasItem[] {
  return [...items].sort((a, b) => {
    const ta = a.dateISO ? new Date(a.dateISO).getTime() : 0;
    const tb = b.dateISO ? new Date(b.dateISO).getTime() : 0;
    return tb - ta;
  });
}

/** Notícia mais recente primeiro; demais em ordem aleatória (ou ordem do feed). */
export function orderNoticiasForDisplay(
  items: NoticiasItem[],
  maxItems: number,
  mode: NoticiasOrderMode,
): NoticiasItem[] {
  const sorted = sortByDateDesc(items);
  if (mode === "feed") return sorted.slice(0, maxItems);
  if (sorted.length <= 1) return sorted.slice(0, maxItems);
  const [head, ...rest] = sorted;
  return [head, ...shuffleArray(rest)].slice(0, maxItems);
}

/** Quantidade a buscar no RSS antes de ordenar/filtrar cards na página. */
export function noticiasFeedFetchMax(displayMax: number): number {
  return Math.min(50, Math.max(displayMax * 5, 15));
}
