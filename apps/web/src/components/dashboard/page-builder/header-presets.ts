export type HeaderPreset = "classic" | "centered" | "minimal" | "overlay" | "sticky" | "split";

export const HEADER_PRESET_OPTIONS: { value: HeaderPreset; label: string }[] = [
  { value: "classic", label: "Classic (logo esquerda, links direita)" },
  { value: "centered", label: "Centered (logo+nome central, links abaixo)" },
  { value: "minimal", label: "Minimal (compacto, poucos links)" },
  { value: "overlay", label: "Overlay (transparente sobre o hero)" },
  { value: "sticky", label: "Sticky (fixo no topo ao scroll)" },
  { value: "split", label: "Split (logo | links | ações)" },
];

export const HEADER_PRESET_VALUES: Record<HeaderPreset, Record<string, unknown>> = {
  classic: {
    headerPreset: "classic",
    backgroundMode: "solid",
    backgroundColor: "#18181b",
    headerTextColor: "#ffffff",
    linkStyle: "text",
    logoSize: "md",
    sticky: false,
    borderBottom: false,
    borderColor: undefined,
    showLanguage: true,
    showHomeLink: true,
  },
  centered: {
    headerPreset: "centered",
    backgroundMode: "solid",
    backgroundColor: "#0b1220",
    headerTextColor: "#ffffff",
    linkStyle: "pill",
    logoSize: "lg",
    sticky: false,
    borderBottom: true,
    borderColor: "rgba(255,255,255,0.08)",
    showLanguage: true,
    showHomeLink: true,
  },
  minimal: {
    headerPreset: "minimal",
    backgroundMode: "transparent",
    backgroundColor: "#18181b",
    headerTextColor: "#ffffff",
    linkStyle: "text",
    logoSize: "sm",
    sticky: false,
    borderBottom: false,
    borderColor: undefined,
    showLanguage: false,
    showHomeLink: false,
  },
  overlay: {
    headerPreset: "overlay",
    backgroundMode: "transparent",
    backgroundColor: "transparent",
    headerTextColor: "#ffffff",
    linkStyle: "text",
    logoSize: "md",
    sticky: false,
    borderBottom: false,
    borderColor: undefined,
    showLanguage: true,
    showHomeLink: true,
  },
  sticky: {
    headerPreset: "sticky",
    backgroundMode: "solid",
    backgroundColor: "#18181b",
    headerTextColor: "#ffffff",
    linkStyle: "text",
    logoSize: "md",
    sticky: true,
    borderBottom: true,
    borderColor: "rgba(255,255,255,0.08)",
    showLanguage: true,
    showHomeLink: true,
  },
  split: {
    headerPreset: "split",
    backgroundMode: "solid",
    backgroundColor: "#0f0f12",
    headerTextColor: "#ffffff",
    linkStyle: "pill",
    logoSize: "md",
    sticky: false,
    borderBottom: true,
    borderColor: "rgba(255,255,255,0.06)",
    showLanguage: true,
    showHomeLink: true,
  },
};

export function applyHeaderPresetOverwrite(
  current: Record<string, unknown> | undefined,
  preset: HeaderPreset,
): Record<string, unknown> {
  const links = current?.headerLinks;
  return {
    ...current,
    ...HEADER_PRESET_VALUES[preset],
    ...(Array.isArray(links) ? { headerLinks: links } : {}),
  };
}
