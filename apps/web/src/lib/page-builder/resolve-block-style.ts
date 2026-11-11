import type { CSSProperties } from "react";
import type { HomeContentBlock } from "@/types/home-content";
import type { PreviewViewport } from "@/components/dashboard/page-builder/usePageEditorSession";

type ResponsiveMap = Partial<Record<PreviewViewport, Record<string, unknown>>>;

/** Cascata desktop → tablet → mobile para preview e overrides explícitos. */
export function resolveEffectiveBlockConfig(
  block: HomeContentBlock,
  viewport: PreviewViewport = "desktop",
): Record<string, unknown> {
  const base = { ...(block.config ?? {}) };
  const resp = base.styleResponsive as ResponsiveMap | undefined;
  if (!resp || viewport === "desktop") {
    const { styleResponsive: _, ...rest } = base;
    return rest;
  }
  const merged: Record<string, unknown> = { ...base };
  delete merged.styleResponsive;
  if (resp.desktop) Object.assign(merged, resp.desktop);
  if (viewport === "tablet" || viewport === "mobile") {
    if (resp.tablet) Object.assign(merged, resp.tablet);
  }
  if (viewport === "mobile" && resp.mobile) {
    Object.assign(merged, resp.mobile);
  }
  return merged;
}

/** Classes Tailwind para visibilidade por viewport (público / SSR). */
export function responsiveVisibilityClasses(block: HomeContentBlock): string {
  const resp = (block.config?.styleResponsive as ResponsiveMap | undefined) ?? {};
  const parts: string[] = [];
  if (resp.mobile?.visible === false) parts.push("max-md:hidden");
  if (resp.tablet?.visible === false) parts.push("md:max-lg:hidden");
  if (resp.desktop?.visible === false) parts.push("lg:hidden");
  return parts.filter(Boolean).join(" ");
}

export function blockMarginStyle(config: Record<string, unknown>): CSSProperties | undefined {
  const top = config.marginTop;
  const bottom = config.marginBottom;
  const style: CSSProperties = {};
  if (top != null && String(top).trim() !== "") style.marginTop = Number.isFinite(Number(top)) ? `${top}px` : String(top);
  if (bottom != null && String(bottom).trim() !== "") style.marginBottom = Number.isFinite(Number(bottom)) ? `${bottom}px` : String(bottom);
  return Object.keys(style).length ? style : undefined;
}
