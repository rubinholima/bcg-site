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
  | "eventos"
  | "founder"
  | "how"
  | "cta"
  | "custom"
  | "text"
  // Clubes (futebol)
  | "proximos_jogos"
  | "ultimos_resultados"
  /** Mesma lógica/config que proximos_jogos — só para páginas de evento (slug = evento). */
  | "proximos_eventos"
  /** Mesma lógica/config que ultimos_resultados — só para páginas de evento. */
  | "ultimos_eventos"
  /** Mesma lógica/config que tabela — só para páginas de evento. */
  | "tabela_eventos"
  | "times_categorias"
  | "noticias"
  | "calendario"
  | "tabela"
  | "patrocinadores"
  | "galeria"
  | "hino" // Hino do clube — letra, cifra, partitura + player MP3
  | "imprensa" // Imprensa / kit de marca — downloads, manual, fotos
  | "galeria_eventos" // Galeria de fotos do evento (Eventos → Futebol)
  // Empresas
  | "sobre"
  | "servicos"
  | "produtos"
  | "equipe"
  | "clientes"
  | "contato"
  | "global_presence"
  | "logo_carousel"
  /** Hub de servidores de e-mail (group home → /email-server) */
  | "email_servers"
  // Imobiliária
  | "imoveis_destaque"
  | "formulario_captura"
  | "diferenciais"
  | "numeros"
  | "como_funciona"
  | "faq"
  // Container: seção com colunas
  | "section";

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

/** Largura do conteúdo: box = centralizado, full = largura total. Sobrescreve o padrão do tema. */
export type ContentWidthMode = "box" | "full";

/** Alinhamento do título do módulo: left | center | right. */
export type TitleAlignMode = "left" | "center" | "right";

/** Config de aparência e conteúdo de um bloco (controle total por módulo) */
export interface HomeBlockConfig {
  /** Largura do conteúdo: box ou full. Se não definido, usa o padrão do tema da página. */
  contentWidth?: ContentWidthMode;
  /** Alinhamento do título. Se não definido, usa o padrão do tema da página. */
  titleAlign?: TitleAlignMode;
  /** Tamanho/altura da seção (compact = menos padding, normal, large = mais padding). Aplica a todos os módulos. */
  sectionSize?: "minimal" | "compact" | "normal" | "large";
  /** Cor de fundo (hex, ex: #18181b). Vazio = transparente (herda do tema). */
  backgroundColor?: string;
  /** Se false, o bloco não aparece na página pública (mas continua editável). */
  visible?: boolean;
  /** Imagem de fundo (URL). Opcional; usa overlay se também tiver backgroundColor. */
  backgroundImage?: string;
  /** Opacidade do overlay sobre a imagem (0-1). Ex: 0.8 = escurece 80%. */
  backgroundOverlayOpacity?: number;
  titlePt?: string;
  titleEn?: string;
  /** Cores do gradiente do título (hex). Vazio = padrão âmbar/branco. */
  titleGradientStart?: string;
  titleGradientEnd?: string;
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
  /** Header: links de navegação — link simples ou menu com subitens (dropdown). */
  headerLinks?: Array<{
    label?: string;
    href?: string;
    children?: Array<{ label?: string; href?: string }>;
  }>;
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
  /** Section: colunas (1 = full, 2 = duas colunas) */
  sectionColumns?: 1 | 2;
  /** Section: layout quando 2 colunas (50-50, 33-66, 66-33) */
  sectionLayout?: "50-50" | "33-66" | "66-33";
  /** Section: título da coluna esquerda (PT/EN) */
  sectionLeftColumnTitlePt?: string;
  sectionLeftColumnTitleEn?: string;
  /** Section: cor/imagem de fundo da coluna esquerda */
  sectionLeftColumnBackgroundColor?: string;
  sectionLeftColumnBackgroundImage?: string;
  sectionLeftColumnBackgroundOverlayOpacity?: number;
  /** Section: título da coluna direita (PT/EN) */
  sectionRightColumnTitlePt?: string;
  sectionRightColumnTitleEn?: string;
  /** Section: cor/imagem de fundo da coluna direita */
  sectionRightColumnBackgroundColor?: string;
  sectionRightColumnBackgroundImage?: string;
  sectionRightColumnBackgroundOverlayOpacity?: number;
  /** Section: módulos da coluna esquerda */
  sectionLeftModules?: HomeContentBlock[];
  /** Section: módulos da coluna direita (só quando columns=2) */
  sectionRightModules?: HomeContentBlock[];
  /** Section: padding topo (minimal, compact, normal, large) */
  sectionPaddingTop?: "minimal" | "compact" | "normal" | "large";
  /** Section: padding base */
  sectionPaddingBottom?: "minimal" | "compact" | "normal" | "large";
  /** Notícias: fonte (rss = feed externo; manual = lista editada) */
  noticiasDataSource?: "rss" | "manual";
  /** Notícias: URL do feed RSS (quando dataSource=rss). Ex: RSS.app, Google News, site do clube */
  noticiasRssUrl?: string;
  /** Notícias: itens manuais (quando dataSource=manual ou fallback) */
  noticiasManualItems?: NoticiasItem[];
  /** Notícias: máx. itens a exibir (default 10) */
  noticiasMaxItems?: number;
  /** Notícias: padding topo da seção */
  noticiasPaddingTop?: "minimal" | "compact" | "normal" | "large";
  /** Notícias: padding base */
  noticiasPaddingBottom?: "minimal" | "compact" | "normal" | "large";
  /** Galeria: fonte (rss = feed Instagram/RSS.app; manual = lista editada) */
  galeriaDataSource?: "rss" | "manual";
  /** Galeria: URL do feed RSS (Instagram via rss.app, etc.) */
  galeriaRssUrl?: string;
  /** Galeria: itens manuais (imagem + link + legenda) */
  galeriaManualItems?: GaleriaItem[];
  /** Galeria: máx. fotos a exibir (default 10) */
  galeriaMaxItems?: number;
  /** Galeria: padding topo da seção */
  galeriaPaddingTop?: "minimal" | "compact" | "normal" | "large";
  /** Galeria: padding base */
  galeriaPaddingBottom?: "minimal" | "compact" | "normal" | "large";
  /** Email servers: lista de servidores (hub /email-server no group home) */
  emailServersItems?: EmailServerItem[];
  emailServersPaddingTop?: "minimal" | "compact" | "normal" | "large";
  emailServersPaddingBottom?: "minimal" | "compact" | "normal" | "large";

  /** Patrocinadores: lista manual (logo, nome, link) */
  patrocinadoresManualItems?: PatrocinadorItem[];
  /** Patrocinadores: logo do título (substitui o texto do título se preenchido) */
  patrocinadoresTitleLogo?: string;
  /** Patrocinadores: subtítulo (PT/EN) */
  patrocinadoresSubtitlePt?: string;
  patrocinadoresSubtitleEn?: string;
  /** Patrocinadores: padding topo da seção */
  patrocinadoresPaddingTop?: "minimal" | "compact" | "normal" | "large";
  /** Patrocinadores: padding base */
  patrocinadoresPaddingBottom?: "minimal" | "compact" | "normal" | "large";
  /** Times por Categorias: categorias e jogadores */
  timesCategoriasCategories?: TeamCategory[];
  /** Times por Categorias: padding topo da seção */
  timesCategoriasPaddingTop?: "minimal" | "compact" | "normal" | "large";
  /** Times por Categorias: padding base */
  timesCategoriasPaddingBottom?: "minimal" | "compact" | "normal" | "large";
  /** Próximos Jogos: padding topo da seção */
  proximosJogosPaddingTop?: "compact" | "normal" | "large";
  /** Próximos Jogos: padding base da seção */
  proximosJogosPaddingBottom?: "compact" | "normal" | "large";
  /** Próximos Jogos: carrossel full-bleed (encosta nas bordas do box azul, sem padding lateral) */
  fullBleedCarousel?: boolean;
  /** Próximos Jogos / Últimos Resultados: velocidade do crawl do carrossel (marquee) */
  fixturesCarouselMarqueeSpeed?: "slow" | "normal" | "fast";
  /** Próximos Jogos: fonte dos dados (manual = lista editada; sofascore = auto pelo tenant.sofascoreTeamId) */
  proximosJogosDataSource?: "manual" | "sofascore";
  /** Próximos Jogos: lista manual (quando dataSource=manual) */
  proximosJogosManualFixtures?: ProximosJogosFixtureItem[];
  /** Próximos Jogos: overrides por externalId (quando dataSource=sofascore) */
  proximosJogosOverrides?: Record<string, ProximosJogosFixtureOverride>;
  /** Tabela Classificação: fonte (manual = lista editada; google_sheets = planilha) */
  tabelaDataSource?: "manual" | "google_sheets";
  /** Tabela: URL ou ID da planilha Google Sheets */
  tabelaSpreadsheetUrl?: string;
  /** Tabela: gid da aba */
  tabelaSheetGid?: string;
  /** Tabela: linhas manuais (quando dataSource=manual) */
  tabelaManualRows?: TabelaStandingsRow[];
  /** Tabela: todos os jogos da competição (FMF sync) para Últ./Próx. */
  tabelaLeagueFixtures?: ProximosJogosFixtureItem[];
  /** Tabela: padding topo */
  tabelaPaddingTop?: "minimal" | "compact" | "normal" | "large";
  /** Tabela: padding base */
  tabelaPaddingBottom?: "minimal" | "compact" | "normal" | "large";
  [key: string]: unknown;
}

/** Linha da tabela de classificação (posição calculada pelo app conforme fórmula da competição) */
export interface TabelaStandingsRow {
  /** Nome da competição (ex.: Mineirão, La Liga) — filtro Competições */
  competicao?: string;
  /** Categoria/faixa etária (principal, sub20, sub17, etc.) — filtro Categoria */
  categoria?: string;
  temporada?: string;
  /** Calculado pelo app; não vem do template */
  posicao?: number;
  /** Calculado pelo app (opcional; requer histórico); não vem do template */
  variacao?: "up" | "down" | "same";
  time: string;
  logoTime?: string;
  pontos: number;
  jogos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  golsMarcados: number;
  golsSofridos: number;
  /** Calculado se não informado: golsMarcados - golsSofridos */
  saldoGols?: number;
  ultimosJogos?: string;
  proximoJogo?: string;
  logoProximo?: string;
}

/** Item de notícia (manual ou retorno do RSS) */
export interface NoticiasItem {
  id?: string;
  title: string;
  link: string;
  excerpt?: string;
  dateISO?: string;
  imageUrl?: string;
  /** URL original da imagem (para carregar no cliente com no-referrer e evitar 403 do proxy). */
  imageUrlOriginal?: string;
  source?: string;
}

/** Item da galeria (manual ou retorno do RSS — Instagram, etc.) */
export interface GaleriaItem {
  id?: string;
  imageUrl: string;
  /** URL original (para carregar direto e evitar 403 do proxy) */
  imageUrlOriginal?: string;
  link?: string;
  title?: string;
  caption?: string;
}

/** Item de patrocinador (logo, nome, link) */
export interface PatrocinadorItem {
  id?: string;
  name?: string;
  logoUrl: string;
  link?: string;
}

/** Servidor de e-mail no hub do grupo (nome + URL de login WorkMail, etc.) */
export interface EmailServerItem {
  id?: string;
  namePt?: string;
  nameEn?: string;
  /** URL completa do webmail / login */
  url: string;
  logoUrl?: string;
}

/** Histórico de temporada do jogador */
export interface PlayerSeasonHistory {
  id?: string;
  /** Ano da temporada */
  year: number;
  /** Nome do time */
  team: string;
  /** Nome da competição */
  competition: string;
  /** Número de partidas jogadas */
  matches?: number;
  /** Número de partidas como titular */
  starts?: number;
  /** Número de substituições (entrou do banco) */
  substitutions?: number;
  /** Gols marcados */
  goals?: number;
  /** Assistências */
  assists?: number;
  /** Tempo total jogado em minutos */
  minutesPlayed?: number;
  /** Cartões amarelos */
  yellowCards?: number;
  /** Cartões vermelhos */
  redCards?: number;
}

/** Redes sociais do jogador */
export interface PlayerSocialMedia {
  /** URL do Instagram */
  instagram?: string;
  /** URL do Twitter/X */
  twitter?: string;
  /** URL do Facebook */
  facebook?: string;
  /** URL do TikTok */
  tiktok?: string;
  /** URL do YouTube */
  youtube?: string;
  /** URL personalizada (site pessoal, etc.) */
  website?: string;
}

/** Item de jogador (Times por Categorias) */
export interface PlayerItem {
  id?: string;
  /** Nome completo do jogador */
  name: string;
  /** Apelido (cadastro — exibido nos cards do site) */
  nickname?: string;
  /** Foto do jogador */
  photoUrl?: string;
  /** Data de nascimento (ISO: YYYY-MM-DD) */
  birthDate?: string;
  /** Nacionalidade */
  nationality?: string;
  /** Altura em cm */
  height?: number;
  /** Peso em kg */
  weight?: number;
  /** Pé predominante */
  preferredFoot?: "left" | "right" | "both";
  /** Número da camisa */
  jerseyNumber?: number;
  /** Posição em campo */
  position?: string;
  /** Posição no campo (coordenadas X/Y de 0 a 100) */
  fieldPosition?: { x: number; y: number };
  /** Time atual */
  currentTeam?: string;
  /** Slug do clube (ex.: boston-city-u20) — usado na sync da planilha */
  clubSlug?: string;
  /** Histórico de equipes (array de strings) */
  previousTeams?: string[];
  /** Histórico detalhado por temporada */
  seasonHistory?: PlayerSeasonHistory[];
  /** Redes sociais */
  socialMedia?: PlayerSocialMedia;
  /** Estatísticas: partidas jogadas */
  matchesPlayed?: number;
  /** Estatísticas: gols marcados */
  goals?: number;
  /** Estatísticas: assistências */
  assists?: number;
  /** Estatísticas: cartões amarelos */
  yellowCards?: number;
  /** Estatísticas: cartões vermelhos */
  redCards?: number;
  /** Valor de mercado (em euros) */
  marketValue?: number;
  /** Melhores momentos (array de URLs de vídeos ou imagens) */
  highlights?: string[];
  /** Biografia curta (PT/EN) */
  bioPT?: string;
  bioEN?: string;
}

/** Categoria de time (ex: Sub-20, Sub-17, Principal, Feminino) */
export interface TeamCategory {
  id: string;
  namePT: string;
  nameEN: string;
  players: PlayerItem[];
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
