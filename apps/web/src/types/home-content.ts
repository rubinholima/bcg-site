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

/** Tipos de bloco/módulo (home, clube, empresa) */
export type HomeBlockType =
  | "header"
  | "footer"
  | "hero"
  | "highlights"
  | "what"
  | "clubs"
  | "companies"
  | "founder"
  | "how"
  | "cta"
  | "custom"
  | "text"
  // Clubes (futebol)
  | "proximos_jogos"
  | "times_categorias"
  | "noticias"
  | "calendario"
  | "tabela"
  | "patrocinadores"
  | "galeria"
  // Empresas
  | "sobre"
  | "servicos"
  | "produtos"
  | "equipe"
  | "clientes"
  | "contato";

/** Efeitos do carrossel do Hero */
export type HeroCarouselEffect = "fade" | "slide" | "zoom";

/** Intervalo em segundos entre slides (temporizador). */
export type HeroCarouselIntervalSeconds = 5 | 10 | 15;

/** Um slide do Hero: URL e títulos opcionais por idioma. */
export interface HeroSlide {
  url: string;
  titlePt?: string;
  titleEn?: string;
}

/** Dimensão recomendada da arte do Hero (para exibir no editor) */
export const HERO_RECOMMENDED_DIMENSIONS = "1920×1080";

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
  /** Hero: múltiplas imagens para carrossel (URLs). @deprecated Use heroSlides. */
  heroImages?: string[];
  /** Hero: slides com URL e título por idioma. */
  heroSlides?: HeroSlide[];
  /** Hero: efeito do carrossel (fade, slide, zoom). */
  heroCarouselEffect?: HeroCarouselEffect;
  /** Hero: tempo em segundos em cada foto (5, 10 ou 15). */
  heroCarouselIntervalSeconds?: HeroCarouselIntervalSeconds;
  /** Header: URL do logo. */
  headerLogoUrl?: string;
  /** Header: links de navegação (label, href). */
  headerLinks?: Array<{ label: string; href: string }>;
  /** Header: cor do texto/links (hex). */
  headerTextColor?: string;
  /** Header: cor de fundo do idioma selecionado (PT/EN) — hex ou rgba. */
  headerLanguageSelectedBg?: string;
  /** Header: cor do texto do idioma selecionado (PT/EN) — hex. */
  headerLanguageSelectedText?: string;
  /** Header: modelo do cabeçalho (fallback classic para páginas antigas). */
  headerPreset?: "classic" | "centered" | "minimal" | "overlay" | "sticky" | "split";
  showLanguage?: boolean;
  showHomeLink?: boolean;
  backgroundMode?: "solid" | "transparent" | "blur";
  /** borderBottom: exibir borda inferior. */
  borderBottom?: boolean;
  borderColor?: string;
  /** sticky: fixo no topo ao scroll (preset sticky). */
  sticky?: boolean;
  logoSize?: "sm" | "md" | "lg";
  linkStyle?: "text" | "pill" | "button";
  /** Footer: texto principal (ex: copyright). */
  footerText?: string;
  /** Footer: links (label, href). */
  footerLinks?: Array<{ label: string; href: string }>;
  /** Footer: cor do texto/links (hex). */
  footerTextColor?: string;
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
