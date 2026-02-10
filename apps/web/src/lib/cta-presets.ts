import type { CtaButtonConfig } from "@/types/home-content";

export type CtaPresetId = "partnerships" | "media" | "investors" | "talents" | "custom";

export interface CtaPresetContent {
  titlePT: string;
  titleEN: string;
  subtitlePT: string;
  subtitleEN: string;
  supportPT: string;
  supportEN: string;
  buttons: CtaButtonConfig[];
}

const PRESETS: Record<Exclude<CtaPresetId, "custom">, CtaPresetContent> = {
  partnerships: {
    titlePT: "Parcerias estratégicas",
    titleEN: "Strategic partnerships",
    subtitlePT: "Conecte-se ao ecossistema Boston City Group.",
    subtitleEN: "Connect with the Boston City Group ecosystem.",
    supportPT: "Operação multi-marca com padrão de excelência.",
    supportEN: "Multi-brand operation with a standard of excellence.",
    buttons: [
      { labelPT: "Fale com o time", labelEN: "Talk to the team", type: "primary", href: "/dashboard", openInNewTab: false, highlighted: true },
      { labelPT: "Explorar empresas", labelEN: "Explore companies", type: "secondary", href: "#companies", openInNewTab: false },
    ],
  },
  media: {
    titlePT: "Mídia e imprensa",
    titleEN: "Media & press",
    subtitlePT: "Conteúdo, credenciais e contato para imprensa.",
    subtitleEN: "Content, credentials and press contact.",
    supportPT: "Acesso a releases, imagens e posicionamento institucional.",
    supportEN: "Access to press releases, images and institutional positioning.",
    buttons: [
      { labelPT: "Acessar portal", labelEN: "Access portal", type: "primary", href: "/dashboard", openInNewTab: false, highlighted: true },
      { labelPT: "Ver clubes", labelEN: "View clubs", type: "secondary", href: "#clubs", openInNewTab: false },
    ],
  },
  investors: {
    titlePT: "Investidores",
    titleEN: "Investors",
    subtitlePT: "Estrutura, governança e oportunidades de investimento.",
    subtitleEN: "Structure, governance and investment opportunities.",
    supportPT: "Holding com operação em esportes, mídia e negócios.",
    supportEN: "Holding with operations in sports, media and business.",
    buttons: [
      { labelPT: "Acessar dashboard", labelEN: "Access dashboard", type: "primary", href: "/dashboard", openInNewTab: false, highlighted: true },
      { labelPT: "Conhecer empresas", labelEN: "Discover companies", type: "secondary", href: "#companies", openInNewTab: false },
    ],
  },
  talents: {
    titlePT: "Talentos e executivos",
    titleEN: "Talents & executives",
    subtitlePT: "Junte-se a um ecossistema em crescimento.",
    subtitleEN: "Join a growing ecosystem.",
    supportPT: "Oportunidades em clubes, mídia e operações corporativas.",
    supportEN: "Opportunities in clubs, media and corporate operations.",
    buttons: [
      { labelPT: "Ver oportunidades", labelEN: "View opportunities", type: "primary", href: "/dashboard", openInNewTab: false, highlighted: true },
      { labelPT: "Explorar portfólio", labelEN: "Explore portfolio", type: "secondary", href: "#about", openInNewTab: false },
    ],
  },
};

/** Retorna o conteúdo padrão de um preset (para preencher só campos vazios). */
export function getCtaPresetContent(preset: CtaPresetId): CtaPresetContent | null {
  if (preset === "custom") return null;
  return PRESETS[preset] ?? null;
}

export const CTA_PRESET_OPTIONS: { value: CtaPresetId; label: string }[] = [
  { value: "custom", label: "Personalizado (editar tudo)" },
  { value: "partnerships", label: "Parcerias estratégicas" },
  { value: "media", label: "Mídia / imprensa" },
  { value: "investors", label: "Investidores" },
  { value: "talents", label: "Talentos e executivos" },
];
