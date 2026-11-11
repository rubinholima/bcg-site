import type { HomeContentBlock } from "./home-content";

/** Largura do conteúdo dos módulos: box = centralizado com max-width, full = largura total. */
export type ContentWidthMode = "box" | "full";

/** Alinhamento dos títulos dos módulos: left | center | right. */
export type TitleAlignMode = "left" | "center" | "right";

/** Aparência geral da página: fundo, cores, fontes. Módulos individuais podem sobrescrever. */
export type BuilderTypographyStyleKey =
  | "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "body" | "small" | "button";

export interface BuilderTypographyStyle {
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  color?: string;
  align?: "left" | "center" | "right";
}

export interface PageSeoSettings {
  seoTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  robotsIndex?: boolean;
  canonicalOverride?: string;
}

export interface PageTheme {
  /** Língua principal ao carregar o site (sem ?lang= nem preferência salva). */
  defaultLang?: "pt" | "en";
  /** Largura padrão dos módulos: box (centralizado) ou full (largura total). Cada módulo pode sobrescrever. */
  contentWidth?: ContentWidthMode;
  /** Alinhamento padrão dos títulos dos módulos. Cada módulo pode sobrescrever. */
  titleAlign?: TitleAlignMode;
  /** Cor de fundo do corpo (hex). Ex: #0f0f12 */
  backgroundColor?: string;
  /** Imagem de fundo do corpo (URL). Usada como background principal da página. */
  backgroundImage?: string;
  /** Opacidade do overlay escuro sobre a imagem (0–1). Ex: 0.75 */
  backgroundOverlayOpacity?: number;
  /** Cor do texto principal (hex). Ex: #fafafa */
  textColor?: string;
  /** Cor de destaque/links (hex). Ex: #fbbf24 */
  accentColor?: string;
  /** Família de fontes (ex: Inter, Geist, system-ui) */
  fontFamily?: string;
  headingFontFamily?: string;
  bodyFontFamily?: string;
  /** Tokens globais opcionais (hex). Compatível com accentColor/textColor legados. */
  globalColors?: Partial<Record<
    "primary" | "secondary" | "accent" | "text" | "background" | "surface" | "muted" | "success" | "warning" | "error",
    string
  >>;
  typography?: Partial<Record<BuilderTypographyStyleKey, BuilderTypographyStyle>>;
  seo?: PageSeoSettings;
}

export interface PageContent {
  /** Aparência global da página. Módulos podem sobrescrever individualmente. */
  theme?: PageTheme;
  blocks?: HomeContentBlock[];
}

export interface Page {
  id: string;
  tenantId: string;
  slug: string;
  title: string | null;
  content: PageContent;
  draftContent?: PageContent | null;
  hasUnpublishedDraft?: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string | null;
    kind?: { id: string; name: string };
  } | null;
}
