/** Tokens globais do tema de página (compatível com JSON legado). */
export type GlobalThemeColors = {
  primary?: string;
  secondary?: string;
  accent?: string;
  text?: string;
  background?: string;
  surface?: string;
  muted?: string;
  success?: string;
  warning?: string;
  error?: string;
};

export const DEFAULT_GLOBAL_THEME: GlobalThemeColors = {
  primary: "#7c3aed",
  secondary: "#27272a",
  accent: "#fbbf24",
  text: "#fafafa",
  background: "#0f0f12",
  surface: "#18181b",
  muted: "#a1a1aa",
  success: "#22c55e",
  warning: "#f59e0b",
  error: "#ef4444",
};

/** Mapeia chaves legadas do PageTheme para tokens globais. */
export function mapLegacyPageThemeToGlobal(theme: Record<string, unknown> | undefined): GlobalThemeColors {
  const t = theme ?? {};
  return {
    primary: (t.primaryColor as string) || DEFAULT_GLOBAL_THEME.primary,
    secondary: (t.secondaryColor as string) || DEFAULT_GLOBAL_THEME.secondary,
    accent: (t.accentColor as string) || DEFAULT_GLOBAL_THEME.accent,
    text: (t.textColor as string) || DEFAULT_GLOBAL_THEME.text,
    background: (t.backgroundColor as string) || DEFAULT_GLOBAL_THEME.background,
    surface: (t.surfaceColor as string) || DEFAULT_GLOBAL_THEME.surface,
    muted: (t.mutedColor as string) || DEFAULT_GLOBAL_THEME.muted,
    success: (t.successColor as string) || DEFAULT_GLOBAL_THEME.success,
    warning: (t.warningColor as string) || DEFAULT_GLOBAL_THEME.warning,
    error: (t.errorColor as string) || DEFAULT_GLOBAL_THEME.error,
  };
}

export type ColorRef = { useGlobal: true; token: keyof GlobalThemeColors } | { useGlobal: false; custom: string };

export function resolveColorRef(ref: ColorRef | undefined, global: GlobalThemeColors): string | undefined {
  if (!ref) return undefined;
  if (ref.useGlobal) return global[ref.token];
  return ref.custom?.trim() || undefined;
}
