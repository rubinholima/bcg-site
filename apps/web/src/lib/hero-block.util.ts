import type { HeroSlide } from "@/types/home-content";
import { getPublicImageUrl, resolveMediaUrlWithProxyFallback } from "@/lib/media-url";

const HERO_TEXT_KEYS = [
  "titlePt",
  "titleEn",
  "subtitlePT",
  "subtitleEN",
  "descriptionPT",
  "descriptionEN",
  "bodyPt",
  "bodyEn",
] as const;

/** URL pronta para `<img>` / carrossel (dev proxy ou CDN). */
export function resolveHeroImageUrl(raw: string | undefined | null): string {
  if (!raw || typeof raw !== "string") return "";
  const t = raw.trim();
  if (!t) return "";
  return resolveMediaUrlWithProxyFallback(t) || getPublicImageUrl(t) || t;
}

function rawHeroUrls(config: Record<string, unknown>): string[] {
  const slides = Array.isArray(config.heroSlides) ? config.heroSlides : [];
  const fromSlides = slides
    .map((s) => String((s as { url?: unknown })?.url ?? "").trim())
    .filter(Boolean);
  if (fromSlides.length > 0) return fromSlides;

  const legacy = Array.isArray(config.heroImages) ? config.heroImages : [];
  const fromLegacy = legacy.map((u) => String(u).trim()).filter(Boolean);
  if (fromLegacy.length > 0) return fromLegacy;

  const bg = String(config.backgroundImage ?? "").trim();
  return bg ? [bg] : [];
}

/** Slides resolvidos para renderização pública. */
export function getHeroDisplaySlides(config: Record<string, unknown> | undefined | null): HeroSlide[] {
  if (!config) return [];
  const out: HeroSlide[] = [];
  for (const url of rawHeroUrls(config)) {
    const resolved = resolveHeroImageUrl(url);
    if (resolved) out.push({ url: resolved, titlePt: "", titleEn: "" });
  }
  return out;
}

/** Ao carregar no editor: garante slides a partir de backgroundImage legado. */
export function normalizeHeroConfigOnLoad(config: Record<string, unknown>): Record<string, unknown> {
  const next = { ...config };
  const urls = rawHeroUrls(next);
  if (urls.length === 0) return next;

  const slides = Array.isArray(next.heroSlides) ? [...next.heroSlides] : [];
  const hasSlideArray = slides.some((s) => String((s as { url?: unknown })?.url ?? "").trim());

  if (!hasSlideArray) {
    next.heroSlides = urls.map((url) => ({ url, titlePt: "", titleEn: "" }));
  }

  return next;
}

/** Ao salvar: remove textos vazios e slides sem URL. */
export function sanitizeHeroConfigForSave(config: Record<string, unknown>): Record<string, unknown> {
  const next = normalizeHeroConfigOnLoad({ ...config });

  for (const key of HERO_TEXT_KEYS) {
    const v = next[key];
    if (typeof v === "string") {
      const t = v.trim();
      if (t) next[key] = t;
      else delete next[key];
    }
  }

  if (Array.isArray(next.heroSlides)) {
    const cleaned = next.heroSlides
      .map((s) => ({
        url: String((s as { url?: unknown })?.url ?? "").trim(),
        titlePt: "",
        titleEn: "",
      }))
      .filter((s) => s.url);
    if (cleaned.length > 0) next.heroSlides = cleaned;
    else delete next.heroSlides;
  }

  return next;
}
