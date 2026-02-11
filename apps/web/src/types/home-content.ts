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
  | "contato"
  | "global_presence"
  | "logo_carousel";

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

/** Dimensão recomendada da arte do Hero (para exibir no editor). */
export const HERO_RECOMMENDED_DIMENSIONS = "1920×1080";

/** Config de aparência e conteúdo de um bloco (controle total por módulo) */
export interface HomeBlockConfig {
  /** Tamanho/altura da seção (compact = menos padding, normal, large = mais padding). Aplica a todos os módulos. */
  sectionSize?: "compact" | "normal" | "large";
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
  /** Hero: subtítulo (PT/EN). */
  subtitlePT?: string;
  subtitleEN?: string;
  /** Hero: descrição curta (PT/EN). */
  descriptionPT?: string;
  descriptionEN?: string;
  /** Hero: CTA primário. */
  primaryCTA?: { labelPT?: string; labelEN?: string; href?: string };
  /** Hero: CTA secundário (opcional). */
  secondaryCTA?: { labelPT?: string; labelEN?: string; href?: string; variant?: "outline" | "ghost" };
  /** Hero: alinhamento horizontal do conteúdo (left | center | right). */
  contentAlign?: "left" | "center" | "right";
  /** Hero: alinhamento vertical (top | center | bottom). */
  verticalAlign?: "top" | "center" | "bottom";
  /** Hero: largura máxima do conteúdo (narrow | normal | wide). */
  maxContentWidth?: "narrow" | "normal" | "wide";
  /** Hero: tamanho do título (xl | 2xl | 3xl). */
  titleSize?: "xl" | "2xl" | "3xl";
  /** Hero: estilo do subtítulo (normal | uppercase | highlighted). */
  subtitleStyle?: "normal" | "uppercase" | "highlighted";
  /** Hero: modo do overlay (solid | gradient). */
  overlayMode?: "solid" | "gradient-bottom" | "gradient-right";
  /** Hero: cor do overlay (hex). */
  overlayColor?: string;
  /** Hero: altura da seção (screen | large | medium | compact). */
  heroHeight?: "screen" | "large" | "medium" | "compact";
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
  /** Fundador: biografia longa (PT/EN). */
  biographyPT?: string;
  biographyEN?: string;
  /** Fundador: frase de destaque / citação (PT/EN). */
  highlightQuotePT?: string;
  highlightQuoteEN?: string;
  /** Fundador: foto (mediaId ou URL). */
  founderPhoto?: string;
  /** Fundador: cargo/função (PT/EN). */
  rolePT?: string;
  roleEN?: string;
  /** Fundador: ano de fundação (ex: 2015). */
  foundedYear?: string;
  /** Fundador: redes sociais (opcional). */
  socialLinkedIn?: string;
  socialInstagram?: string;
  socialTwitter?: string;
  socialWebsite?: string;
  /** Destaques: 3 frases em PT. */
  highlightsPt?: string[];
  /** Destaques: 3 frases em EN. */
  highlightsEn?: string[];
  /** Destaques: 3 ícones (nomes: Trophy, Globe, Layers, Award, Target, etc.). */
  highlightsIcons?: [string, string, string];
  /** O que fazemos: posição da foto (esquerda ou direita). */
  whatImagePosition?: "left" | "right";
  /** O que fazemos: cards em PT (título + corpo por card). */
  cardsPt?: Array<{ title?: string; body?: string }>;
  /** O que fazemos: cards em EN (título + corpo por card). */
  cardsEn?: Array<{ title?: string; body?: string }>;
  /** Como funciona: 4 bullets em PT. */
  bulletsPt?: string[];
  /** Como funciona: 4 bullets em EN. */
  bulletsEn?: string[];
  /** Como funciona: 4 ícones (nomes: CheckCircle, Trophy, Globe, etc.). */
  howBulletsIcons?: [string, string, string, string];
  /** CTA Final: subtítulo (PT/EN). */
  ctaSubtitlePT?: string;
  ctaSubtitleEN?: string;
  /** CTA Final: texto de apoio opcional (PT/EN). */
  ctaSupportTextPT?: string;
  ctaSupportTextEN?: string;
  /** CTA Final: layout da seção. */
  ctaLayout?: "centered" | "split" | "boxed";
  /** CTA Final: alinhamento do texto. */
  ctaTextAlign?: "left" | "center";
  /** CTA Final: largura do conteúdo. */
  ctaContentWidth?: "normal" | "wide";
  /** CTA Final: tipo de fundo. */
  ctaBackgroundMode?: "image" | "gradient" | "solid";
  /** CTA Final: opacidade do overlay (0-1). */
  ctaOverlayOpacity?: number;
  /** CTA Final: blur no fundo (quando imagem). */
  ctaBlur?: boolean;
  /** CTA Final: preset (preenche só campos vazios). */
  ctaPreset?: "partnerships" | "media" | "investors" | "talents" | "custom";
  /** CTA Final: gradiente (quando backgroundMode = gradient). */
  ctaGradientStart?: string;
  ctaGradientEnd?: string;
  /** CTA Final: até 3 botões. */
  ctaButtons?: CtaButtonConfig[];
  /** Global Presence: descrição opcional (título/subtítulo usam titlePt/titleEn e subtitlePT/subtitleEN) */
  descriptionPT?: string;
  descriptionEN?: string;
  /** Global Presence: tema e cores FIFA */
  themePreset?: "fifa";
  /** backgroundColor já existe; accentColor e mapTint para pontos e mapa */
  accentColor?: string;
  mapTint?: string;
  overlayOpacity?: number;
  showGridLines?: boolean;
  sectionHeight?: "compact" | "normal" | "tall";
  /** Global Presence: contadores (clubes, atletas, projetos, países) */
  counters?: GlobalPresenceCounter[];
  /** Global Presence: lista de localizações no mapa */
  locations?: GlobalPresenceLocation[];
  /** Logo Carousel: configuração do módulo inteiro */
  logoCarouselSectionPadding?: "compact" | "normal" | "large";
  logoCarouselCardStyle?: "fifa" | "minimal" | "glass";
  logoCarouselCardHeight?: number;
  logoCarouselCardRadius?: number;
  logoCarouselCardBackground?: string;
  logoCarouselShowShadow?: boolean;
  logoCarouselGapBetweenCards?: number;
  logoCarouselAnimationSpeed?: "slow" | "normal" | "fast";
  logoCarouselPauseOnHover?: boolean;
  logoCarouselDirection?: "left-to-right" | "right-to-left";
  logoCarouselOpenInNewTab?: boolean;
  /** Logo Carousel: bloco Clubes */
  logoCarouselClubsEnabled?: boolean;
  logoCarouselClubsTitlePT?: string;
  logoCarouselClubsTitleEN?: string;
  logoCarouselClubsSubtitlePT?: string;
  logoCarouselClubsSubtitleEN?: string;
  logoCarouselClubsLimit?: number;
  logoCarouselClubsSorting?: "alphabetical" | "newest" | "manual";
  logoCarouselClubsFallbackLogo?: string;
  /** Logo Carousel: bloco Empresas */
  logoCarouselCompaniesEnabled?: boolean;
  logoCarouselCompaniesTitlePT?: string;
  logoCarouselCompaniesTitleEN?: string;
  logoCarouselCompaniesSubtitlePT?: string;
  logoCarouselCompaniesSubtitleEN?: string;
  logoCarouselCompaniesLimit?: number;
  logoCarouselCompaniesSorting?: "alphabetical" | "newest" | "manual";
  logoCarouselCompaniesFallbackLogo?: string;
  /** Próximos Jogos: padding topo da seção */
  proximosJogosPaddingTop?: "compact" | "normal" | "large";
  /** Próximos Jogos: padding base da seção */
  proximosJogosPaddingBottom?: "compact" | "normal" | "large";
  /** Próximos Jogos: fonte dos dados (manual = lista editada; sofascore = auto pelo tenant.sofascoreTeamId) */
  proximosJogosDataSource?: "manual" | "sofascore";
  /** Próximos Jogos: lista manual (quando dataSource=manual) */
  proximosJogosManualFixtures?: ProximosJogosFixtureItem[];
  /** Próximos Jogos: overrides por externalId (quando dataSource=sofascore) */
  proximosJogosOverrides?: Record<string, ProximosJogosFixtureOverride>;
  [key: string]: unknown;
}

/** Item de fixture (manual ou retorno da API) */
export interface ProximosJogosFixtureItem {
  externalId?: string;
  startISO: string;
  status?: "SCHEDULED" | "LIVE" | "FINAL";
  competitionName?: string;
  competitionLogoUrl?: string;
  venueName?: string;
  homeTeamName: string;
  awayTeamName: string;
  watchUrl?: string;
  ticketUrl?: string;
  featured?: boolean;
  /** Categoria: principal, sub20, sub17, sub15, feminino */
  category?: string;
}

/** Override por jogo (SofaScore) no editor */
export interface ProximosJogosFixtureOverride {
  hidden?: boolean;
  featured?: boolean;
  watchUrl?: string;
  ticketUrl?: string;
  venueName?: string;
  competitionLogoUrl?: string;
  category?: string;
}

/** Localização no mapa Presença Global (lat/lng, nome, tipo, etc.) */
export interface GlobalPresenceLocation {
  id: string;
  name: string;
  type: "Club" | "Company" | "Academy" | "Media" | "Technology";
  city: string;
  country: string;
  lat: number;
  lng: number;
  logoMediaId?: string;
  websiteUrl?: string;
  active: boolean;
}

/** Contador do módulo Presença Global (Clubes, Empresas, Atletas, Projetos, Países) */
export interface GlobalPresenceCounter {
  key: "clubs" | "companies" | "athletes" | "projects" | "countries";
  labelPT: string;
  labelEN: string;
  value: number;
  enabled: boolean;
}

/** Um botão do CTA Final (até 3). */
export interface CtaButtonConfig {
  labelPT?: string;
  labelEN?: string;
  type?: "primary" | "secondary" | "ghost";
  href?: string;
  openInNewTab?: boolean;
  highlighted?: boolean;
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
