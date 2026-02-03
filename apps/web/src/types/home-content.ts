export interface HomeContentImages {
  hero?: string;
  what?: string;
  founder?: string;
  cta?: string;
}

export interface HomeContentPt {
  hero?: { headline?: string; subheadline?: string; ctaClubs?: string; ctaCompanies?: string };
  highlights?: [string?, string?, string?];
  what?: {
    title?: string;
    body?: string;
    cards?: Array<{ title?: string; body?: string }>;
  };
  clubs?: { title?: string; subtext?: string; visitSite?: string; openProfile?: string };
  companies?: { title?: string; subtext?: string; visitWebsite?: string; openProfile?: string };
  founder?: {
    title?: string;
    body?: string;
    bullets?: [string?, string?, string?];
    quote?: string;
  };
  how?: { title?: string; body?: string; bullets?: [string?, string?, string?, string?] };
  cta?: { title?: string; body?: string; contact?: string; dashboard?: string };
  errorBanner?: string;
}

export interface HomeContentEn {
  hero?: { headline?: string; subheadline?: string; ctaClubs?: string; ctaCompanies?: string };
  highlights?: [string?, string?, string?];
  what?: {
    title?: string;
    body?: string;
    cards?: Array<{ title?: string; body?: string }>;
  };
  clubs?: { title?: string; subtext?: string; visitSite?: string; openProfile?: string };
  companies?: { title?: string; subtext?: string; visitWebsite?: string; openProfile?: string };
  founder?: {
    title?: string;
    body?: string;
    bullets?: [string?, string?, string?];
    quote?: string;
  };
  how?: { title?: string; body?: string; bullets?: [string?, string?, string?, string?] };
  cta?: { title?: string; body?: string; contact?: string; dashboard?: string };
  errorBanner?: string;
}

/** Tipos de bloco/módulo na home (seções editáveis, ordem e títulos) */
export type HomeBlockType =
  | "hero"
  | "highlights"
  | "what"
  | "clubs"
  | "companies"
  | "founder"
  | "how"
  | "cta"
  | "custom"
  | "text";

/** Config de aparência e conteúdo de um bloco (controle total por módulo) */
export interface HomeBlockConfig {
  /** Cor de fundo (hex, ex: #18181b). Vazio = padrão da seção. */
  backgroundColor?: string;
  /** Imagem de fundo (URL). Opcional; usa overlay se também tiver backgroundColor. */
  backgroundImage?: string;
  /** Opacidade do overlay sobre a imagem (0-1). Ex: 0.8 = escurece 80%. */
  backgroundOverlayOpacity?: number;
  titlePt?: string;
  titleEn?: string;
  bodyPt?: string;
  bodyEn?: string;
  /** Imagem dentro do conteúdo (custom/text) */
  imageUrl?: string;
  [key: string]: unknown;
}

/** Um bloco da home: tipo, ordem e config (aparência + conteúdo) */
export interface HomeContentBlock {
  id: string;
  type: HomeBlockType;
  sortOrder: number;
  config?: HomeBlockConfig;
}

export interface HomeContentDto {
  pt?: HomeContentPt;
  en?: HomeContentEn;
  images?: HomeContentImages;
  /** Módulos da página: ordem e overrides (títulos, imagens de fundo). Se vazio, usa ordem padrão e pt/en/images. */
  blocks?: HomeContentBlock[];
}
