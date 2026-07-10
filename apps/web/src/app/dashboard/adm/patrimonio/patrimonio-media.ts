import { getDashboardMediaThumbSrc } from "@/lib/media-url";

/** Miniatura do bem — proxy autenticado (bucket privado), igual à página Mídia. */
export function patrimonioMediaThumbSrc(raw: string | undefined | null): string {
  return getDashboardMediaThumbSrc(raw);
}
