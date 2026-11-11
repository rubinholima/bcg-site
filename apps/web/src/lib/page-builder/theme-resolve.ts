import type { PageTheme } from "@/types/page";
import { DEFAULT_GLOBAL_THEME, mapLegacyPageThemeToGlobal } from "@bcg/page-builder-core";
import type { HomeContentBlock } from "@/types/home-content";

export type ResolvedSiteTheme = ReturnType<typeof mapLegacyPageThemeToGlobal> & {
  headingFont?: string;
  bodyFont?: string;
};

export function resolveSiteTheme(theme?: PageTheme | null): ResolvedSiteTheme {
  const raw = (theme ?? {}) as Record<string, unknown>;
  const mapped = mapLegacyPageThemeToGlobal(raw as Record<string, unknown>);
  const colors = (raw.globalColors as Record<string, string> | undefined) ?? {};
  return {
    ...DEFAULT_GLOBAL_THEME,
    ...mapped,
    primary: colors.primary?.trim() || mapped.primary,
    secondary: colors.secondary?.trim() || mapped.secondary,
    accent: (raw.accentColor as string)?.trim() || colors.accent?.trim() || mapped.accent,
    text: (raw.textColor as string)?.trim() || colors.text?.trim() || mapped.text,
    background: (raw.backgroundColor as string)?.trim() || colors.background?.trim() || mapped.background,
    surface: colors.surface?.trim() || mapped.surface,
    muted: colors.muted?.trim() || mapped.muted,
    success: colors.success?.trim() || mapped.success,
    warning: colors.warning?.trim() || mapped.warning,
    error: colors.error?.trim() || mapped.error,
    headingFont: (raw.headingFontFamily as string)?.trim() || (raw.fontFamily as string)?.trim(),
    bodyFont: (raw.bodyFontFamily as string)?.trim() || (raw.fontFamily as string)?.trim(),
  };
}

export function resolveBlockAlignments(
  block: HomeContentBlock,
  theme?: PageTheme | null,
): {
  title: "left" | "center" | "right";
  subtitle: "left" | "center" | "right";
  body: "left" | "center" | "right";
} {
  const themeAlign = (theme?.titleAlign as "left" | "center" | "right") ?? "left";
  const cfg = block.config ?? {};
  return {
    title: (cfg.titleAlign as "left" | "center" | "right") ?? themeAlign,
    subtitle: (cfg.subtitleAlign as "left" | "center" | "right") ?? (cfg.titleAlign as "left" | "center" | "right") ?? themeAlign,
    body: (cfg.bodyAlign as "left" | "center" | "right") ?? themeAlign,
  };
}

export function alignmentClass(align: "left" | "center" | "right"): string {
  return align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
}
