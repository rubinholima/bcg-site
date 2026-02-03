import type { HomeContentDto, HomeContentBlock, HomeBlockType } from "@/types/home-content";
import { copy } from "@/lib/home-copy";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

const DEFAULT_HERO =
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920&q=80";
const DEFAULT_WHAT =
  "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&q=80";
const DEFAULT_FOUNDER =
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&q=80";
const DEFAULT_CTA =
  "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80";

export async function fetchHomeContent(): Promise<HomeContentDto | null> {
  try {
    const res = await fetch(`${apiUrl}/public/home-content`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as HomeContentDto;
  } catch {
    return null;
  }
}

function deepMerge<T extends Record<string, unknown>>(
  base: T,
  override: Record<string, unknown> | undefined
): T {
  if (!override || typeof override !== "object") return base;
  const result = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(override)) {
    const baseVal = result[key];
    const overrideVal = override[key];
    if (
      overrideVal != null &&
      typeof overrideVal === "object" &&
      !Array.isArray(overrideVal) &&
      baseVal != null &&
      typeof baseVal === "object" &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        overrideVal as Record<string, unknown>
      );
    } else if (overrideVal !== undefined && overrideVal !== "") {
      result[key] = overrideVal;
    }
  }
  return result as T;
}

function mergeLang(
  base: typeof copy.pt,
  override: Record<string, unknown> | undefined
): typeof copy.pt {
  if (!override) return base;
  return deepMerge(base as Record<string, unknown>, override) as typeof copy.pt;
}

/** Ordem padrão dos módulos na home */
export const DEFAULT_BLOCK_IDS: string[] = [
  "hero",
  "highlights",
  "what",
  "clubs",
  "companies",
  "founder",
  "how",
  "cta",
];

const BLOCK_LABELS: Record<string, { pt: string; en: string }> = {
  hero: { pt: "Hero (manchete e fundo)", en: "Hero" },
  highlights: { pt: "Destaques (3 frases)", en: "Highlights" },
  what: { pt: "O que fazemos", en: "What we do" },
  clubs: { pt: "Clubes", en: "Clubs" },
  companies: { pt: "Empresas", en: "Companies" },
  founder: { pt: "Fundador", en: "Founder" },
  how: { pt: "Como funciona", en: "How it works" },
  cta: { pt: "CTA final", en: "CTA" },
  custom: { pt: "Módulo customizado (título + texto + imagem)", en: "Custom (title + text + image)" },
  text: { pt: "Bloco de texto (título + corpo)", en: "Text block (title + body)" },
};

export function getBlockLabel(id: string, type: HomeBlockType, lang: "pt" | "en"): string {
  if (type === "custom" && id.startsWith("custom-")) return BLOCK_LABELS.custom[lang] + ` (${id})`;
  if (type === "text" && id.startsWith("text-")) return BLOCK_LABELS.text[lang] + ` (${id})`;
  return BLOCK_LABELS[id]?.[lang] ?? BLOCK_LABELS[type]?.[lang] ?? id;
}

/** Retorna lista ordenada de blocos: do conteúdo ou padrão (hero, highlights, ...). */
export function getOrderedBlocks(content: HomeContentDto | null): HomeContentBlock[] {
  const blocks = content?.blocks;
  if (blocks && blocks.length > 0) {
    return [...blocks].sort((a, b) => a.sortOrder - b.sortOrder);
  }
  return DEFAULT_BLOCK_IDS.map((id, index) => ({
    id,
    type: id as HomeBlockType,
    sortOrder: index,
    config: {},
  }));
}

export function mergeHomeContent(content: HomeContentDto | null) {
  const pt = mergeLang(copy.pt, content?.pt as Record<string, unknown> | undefined);
  const en = mergeLang(copy.en, content?.en as Record<string, unknown> | undefined);
  const images = {
    hero: content?.images?.hero || DEFAULT_HERO,
    what: content?.images?.what || DEFAULT_WHAT,
    founder: content?.images?.founder || DEFAULT_FOUNDER,
    cta: content?.images?.cta || DEFAULT_CTA,
  };
  const blocks = getOrderedBlocks(content);
  return { pt, en, images, blocks };
}
