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

type SectionColumnSide = "left" | "middle" | "right";

const COLUMN_TITLE_GRADIENT_PREFIX: Record<SectionColumnSide, string> = {
  left: "sectionLeftColumnTitle",
  middle: "sectionMiddleColumnTitle",
  right: "sectionRightColumnTitle",
};

/** Gradiente do SectionTitle da coluna — usa cores do módulo quando o título da coluna substitui o do módulo. */
export function resolveColumnTitleGradient(
  blockConfig: Record<string, unknown> | null | undefined,
  column: SectionColumnSide,
  modules: { config?: Record<string, unknown> | null }[],
): { gradientStart?: string; gradientEnd?: string } {
  const prefix = COLUMN_TITLE_GRADIENT_PREFIX[column];
  const colStart = (blockConfig?.[`${prefix}GradientStart`] as string | undefined)?.trim();
  const colEnd = (blockConfig?.[`${prefix}GradientEnd`] as string | undefined)?.trim();

  if (modules.length === 1 && !moduleHasOwnTitle(modules[0]!)) {
    const mc = modules[0]!.config;
    const modStart = (mc?.titleGradientStart as string | undefined)?.trim();
    const modEnd = (mc?.titleGradientEnd as string | undefined)?.trim();
    if (modStart || modEnd) {
      return {
        gradientStart: modStart || colStart,
        gradientEnd: modEnd || colEnd,
      };
    }
  }

  return { gradientStart: colStart, gradientEnd: colEnd };
}
