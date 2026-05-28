import type { CSSProperties } from "react";

/** Cores do gradiente do SectionTitle — global e por módulo dentro de seção colunas. */
export function moduleTitleGradientStyle(config?: Record<string, unknown> | null): CSSProperties | undefined {
  const start = (config?.titleGradientStart as string | undefined)?.trim();
  const end = (config?.titleGradientEnd as string | undefined)?.trim();
  if (!start && !end) return undefined;
  return {
    ["--module-title-gradient-start" as string]: start || "#fcd34d",
    ["--module-title-gradient-end" as string]: end || "#ffffff",
  } as CSSProperties;
}

export function moduleHasOwnTitle(m: { config?: Record<string, unknown> | null }): boolean {
  const pt = (m.config?.titlePt as string | undefined)?.trim();
  const en = (m.config?.titleEn as string | undefined)?.trim();
  return Boolean(pt || en);
}

export function shouldShowSectionColumnTitle(
  columnTitle: string | undefined,
  modules: { config?: Record<string, unknown> | null }[],
): boolean {
  if (!columnTitle?.trim() || modules.length !== 1) return false;
  return !moduleHasOwnTitle(modules[0]!);
}
