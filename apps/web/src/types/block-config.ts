import type {
  HeroSlide,
  GlobalPresenceCounter,
  CtaButtonConfig,
} from "@/types/home-content";

/** Link do cabeçalho ou rodapé (label + href). */
export interface HeaderFooterLink {
  label: string;
  href: string;
}

/** CTA principal (Hero etc.): labels e link. */
export interface PrimaryCTA {
  labelPT?: string;
  labelEN?: string;
  href?: string;
}

/** CTA secundário: mesmo que PrimaryCTA + variant. */
export interface SecondaryCTA extends PrimaryCTA {
  variant?: "outline" | "ghost";
}

/**
 * Union único para valores de block.config.
 * Usado em updateBlockConfigValue em todas as páginas de edição (conteudo, group-home, tenant).
 */
export type BlockConfigValue =
  | string
  | number
  | boolean
  | string[]
  | HeroSlide[]
  | GlobalPresenceCounter[]
  | HeaderFooterLink[]
  | PrimaryCTA
  | SecondaryCTA
  | CtaButtonConfig[]
  | Record<string, string>[]
  | Record<string, unknown>[]
  | unknown[]
  | undefined;
