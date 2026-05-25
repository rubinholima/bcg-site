/**
 * Tamanhos de placeholder para imagens do site (back, hero, cards, etc.).
 * Logos não usam placeholder; apenas fundos e placeholders de conteúdo.
 * O sizeKey é usado como pasta no S3 (media/{sizeKey}/) e para filtrar no dropdown.
 */
export const MEDIA_PLACEHOLDER_SIZES = {
  hero: { label: "Hero (carrossel / topo)", dimensions: "1920×1080" },
  hero_compact: { label: "Hero compacto", dimensions: "1920×800" },
  section_bg: { label: "Fundo de seção", dimensions: "1920×1080" },
  backgrounds: { label: "Backgrounds (fundo da página)", dimensions: "1920×1080" },
  card: { label: "Card / bloco", dimensions: "800×600" },
  patrimonio: { label: "Patrimônio (foto do bem)", dimensions: "1200×800" },
  rh: { label: "RH / funcionários (fotos)", dimensions: "800×600" },
  patrocinadores: { label: "Patrocinadores (logos)", dimensions: "400×400" },
  jogadores: { label: "Jogadores (fotos)", dimensions: "800×600" },
  jogadores_apoio: { label: "Imagens de apoio (jogadores)", dimensions: "800×600" },
  comissao: { label: "Comissão técnica (fotos)", dimensions: "800×600" },
  medico: { label: "Depto médico (fotos)", dimensions: "800×600" },
  psicologia: { label: "Psicologia (fotos)", dimensions: "800×600" },
  cta: { label: "CTA / chamada", dimensions: "1200×630" },
  gallery: { label: "Galeria", dimensions: "1200×800" },
  galeria_clubes: { label: "Galeria fotos clubes", dimensions: "1200×800" },
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
  /** Nome amigável para exibir no menu e listagem (editável no dashboard Mídia). */
  displayName?: string | null;
}
