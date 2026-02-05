/**
 * Tamanhos de placeholder para imagens do site (back, hero, cards, etc.).
 * Logos não usam placeholder; apenas fundos e placeholders de conteúdo.
 * O sizeKey é usado como pasta no S3 (media/{sizeKey}/) e para filtrar no dropdown.
 */
export const MEDIA_PLACEHOLDER_SIZES = {
  hero: { label: "Hero (carrossel / topo)", dimensions: "1920×1080" },
  hero_compact: { label: "Hero compacto", dimensions: "1920×800" },
  section_bg: { label: "Fundo de seção", dimensions: "1920×1080" },
  card: { label: "Card / bloco", dimensions: "800×600" },
  cta: { label: "CTA / chamada", dimensions: "1200×630" },
  gallery: { label: "Galeria", dimensions: "1200×800" },
  custom: { label: "Outro (sem filtro)", dimensions: "—" },
} as const;

export type MediaPlaceholderSizeKey = keyof typeof MEDIA_PLACEHOLDER_SIZES;

/** Lista de sizeKeys para dropdown (exceto "custom" se quiser só tamanhos fixos). */
export const MEDIA_PLACEHOLDER_KEYS = Object.keys(
  MEDIA_PLACEHOLDER_SIZES,
) as MediaPlaceholderSizeKey[];

export interface MediaItem {
  key: string;
  url: string;
  size: number;
  lastModified: string;
  sizeKey?: string;
  /** Preenchido quando listagem é "Tudo" (logos + media): "logos" | "media". */
  folder?: string;
}
