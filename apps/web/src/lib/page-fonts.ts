import type { PageTheme } from "@/types/page";

export type PageFontCategory = "site" | "sans" | "serif" | "display" | "mono";

export type PageFontPreset = {
  id: string;
  label: string;
  value: string;
  category: PageFontCategory;
  /** Nome na Google Fonts — omitir para fontes do sistema. */
  googleFamily?: string;
};

export const PAGE_FONT_CATEGORY_LABELS: Record<PageFontCategory, string> = {
  site: "Padrão do site",
  sans: "Sans-serif",
  serif: "Serif",
  display: "Display / impacto",
  mono: "Monoespaçada",
};

/** Presets tipográficos para Construção Web (global e por módulo). */
export const PAGE_FONT_PRESETS: PageFontPreset[] = [
  {
    id: "geist",
    label: "Geist Sans (padrão do site)",
    value: "var(--font-geist-sans), system-ui, sans-serif",
    category: "site",
  },
  {
    id: "system",
    label: "System UI",
    value: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    category: "site",
  },

  { id: "inter", label: "Inter", value: "Inter, system-ui, sans-serif", category: "sans", googleFamily: "Inter" },
  { id: "roboto", label: "Roboto", value: "Roboto, system-ui, sans-serif", category: "sans", googleFamily: "Roboto" },
  {
    id: "open-sans",
    label: "Open Sans",
    value: "'Open Sans', system-ui, sans-serif",
    category: "sans",
    googleFamily: "Open Sans",
  },
  {
    id: "montserrat",
    label: "Montserrat",
    value: "Montserrat, system-ui, sans-serif",
    category: "sans",
    googleFamily: "Montserrat",
  },
  { id: "poppins", label: "Poppins", value: "Poppins, system-ui, sans-serif", category: "sans", googleFamily: "Poppins" },
  { id: "lato", label: "Lato", value: "Lato, system-ui, sans-serif", category: "sans", googleFamily: "Lato" },
  { id: "nunito", label: "Nunito", value: "Nunito, system-ui, sans-serif", category: "sans", googleFamily: "Nunito" },
  { id: "raleway", label: "Raleway", value: "Raleway, system-ui, sans-serif", category: "sans", googleFamily: "Raleway" },
  { id: "oswald", label: "Oswald", value: "Oswald, system-ui, sans-serif", category: "sans", googleFamily: "Oswald" },
  {
    id: "work-sans",
    label: "Work Sans",
    value: "'Work Sans', system-ui, sans-serif",
    category: "sans",
    googleFamily: "Work Sans",
  },
  {
    id: "dm-sans",
    label: "DM Sans",
    value: "'DM Sans', system-ui, sans-serif",
    category: "sans",
    googleFamily: "DM Sans",
  },
  {
    id: "source-sans-3",
    label: "Source Sans 3",
    value: "'Source Sans 3', system-ui, sans-serif",
    category: "sans",
    googleFamily: "Source Sans 3",
  },
  { id: "ubuntu", label: "Ubuntu", value: "Ubuntu, system-ui, sans-serif", category: "sans", googleFamily: "Ubuntu" },
  { id: "rubik", label: "Rubik", value: "Rubik, system-ui, sans-serif", category: "sans", googleFamily: "Rubik" },
  { id: "manrope", label: "Manrope", value: "Manrope, system-ui, sans-serif", category: "sans", googleFamily: "Manrope" },
  { id: "outfit", label: "Outfit", value: "Outfit, system-ui, sans-serif", category: "sans", googleFamily: "Outfit" },
  {
    id: "plus-jakarta-sans",
    label: "Plus Jakarta Sans",
    value: "'Plus Jakarta Sans', system-ui, sans-serif",
    category: "sans",
    googleFamily: "Plus Jakarta Sans",
  },
  { id: "figtree", label: "Figtree", value: "Figtree, system-ui, sans-serif", category: "sans", googleFamily: "Figtree" },
  { id: "lexend", label: "Lexend", value: "Lexend, system-ui, sans-serif", category: "sans", googleFamily: "Lexend" },
  {
    id: "public-sans",
    label: "Public Sans",
    value: "'Public Sans', system-ui, sans-serif",
    category: "sans",
    googleFamily: "Public Sans",
  },
  {
    id: "barlow",
    label: "Barlow",
    value: "Barlow, system-ui, sans-serif",
    category: "sans",
    googleFamily: "Barlow",
  },

  {
    id: "playfair",
    label: "Playfair Display",
    value: "'Playfair Display', Georgia, serif",
    category: "serif",
    googleFamily: "Playfair Display",
  },
  {
    id: "merriweather",
    label: "Merriweather",
    value: "Merriweather, Georgia, serif",
    category: "serif",
    googleFamily: "Merriweather",
  },
  { id: "lora", label: "Lora", value: "Lora, Georgia, serif", category: "serif", googleFamily: "Lora" },
  {
    id: "source-serif-4",
    label: "Source Serif 4",
    value: "'Source Serif 4', Georgia, serif",
    category: "serif",
    googleFamily: "Source Serif 4",
  },
  {
    id: "cormorant",
    label: "Cormorant Garamond",
    value: "'Cormorant Garamond', Georgia, serif",
    category: "serif",
    googleFamily: "Cormorant Garamond",
  },
  {
    id: "libre-baskerville",
    label: "Libre Baskerville",
    value: "'Libre Baskerville', Georgia, serif",
    category: "serif",
    googleFamily: "Libre Baskerville",
  },
  { id: "pt-serif", label: "PT Serif", value: "'PT Serif', Georgia, serif", category: "serif", googleFamily: "PT Serif" },
  {
    id: "crimson-text",
    label: "Crimson Text",
    value: "'Crimson Text', Georgia, serif",
    category: "serif",
    googleFamily: "Crimson Text",
  },
  {
    id: "eb-garamond",
    label: "EB Garamond",
    value: "'EB Garamond', Georgia, serif",
    category: "serif",
    googleFamily: "EB Garamond",
  },

  {
    id: "bebas-neue",
    label: "Bebas Neue",
    value: "'Bebas Neue', Impact, sans-serif",
    category: "display",
    googleFamily: "Bebas Neue",
  },
  { id: "anton", label: "Anton", value: "Anton, Impact, sans-serif", category: "display", googleFamily: "Anton" },
  {
    id: "archivo-black",
    label: "Archivo Black",
    value: "'Archivo Black', Impact, sans-serif",
    category: "display",
    googleFamily: "Archivo Black",
  },
  {
    id: "teko",
    label: "Teko",
    value: "Teko, Impact, sans-serif",
    category: "display",
    googleFamily: "Teko",
  },

  {
    id: "mono",
    label: "Monoespaçada (sistema)",
    value: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    category: "mono",
  },
  {
    id: "jetbrains-mono",
    label: "JetBrains Mono",
    value: "'JetBrains Mono', ui-monospace, monospace",
    category: "mono",
    googleFamily: "JetBrains Mono",
  },
  {
    id: "fira-code",
    label: "Fira Code",
    value: "'Fira Code', ui-monospace, monospace",
    category: "mono",
    googleFamily: "Fira Code",
  },
];

const PAGE_FONT_CATEGORY_ORDER: PageFontCategory[] = ["site", "sans", "serif", "display", "mono"];

export function pageFontPresetsByCategory(): { category: PageFontCategory; label: string; presets: PageFontPreset[] }[] {
  return PAGE_FONT_CATEGORY_ORDER.map((category) => ({
    category,
    label: PAGE_FONT_CATEGORY_LABELS[category],
    presets: PAGE_FONT_PRESETS.filter((p) => p.category === category),
  })).filter((g) => g.presets.length > 0);
}

/** URL única do Google Fonts com todas as famílias dos presets. */
export function buildPageFontsGoogleStylesheetUrl(): string {
  const families = [...new Set(PAGE_FONT_PRESETS.map((p) => p.googleFamily).filter(Boolean))] as string[];
  const query = families
    .map((name) => `family=${encodeURIComponent(name).replace(/%20/g, "+")}:wght@400;500;600;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${query}&display=swap`;
}

export function resolveFontFamily(
  moduleConfig?: Record<string, unknown> | null,
  theme?: PageTheme | null,
): string | undefined {
  const moduleFont = (moduleConfig?.fontFamily as string | undefined)?.trim();
  if (moduleFont) return moduleFont;
  const themeFont = theme?.fontFamily?.trim();
  if (themeFont) return themeFont;
  return undefined;
}

export function fontPresetIdFromValue(value?: string): string {
  const v = value?.trim();
  if (!v) return "inherit";
  const found = PAGE_FONT_PRESETS.find((p) => p.value === v);
  return found?.id ?? "custom";
}
