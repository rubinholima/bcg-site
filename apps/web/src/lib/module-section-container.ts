import type { HomeContentBlock } from "@/types/home-content";

const MAX_WIDTH_CLASS: Record<"narrow" | "normal" | "wide", string> = {
  narrow: "max-w-3xl",
  normal: "max-w-5xl",
  wide: "max-w-7xl",
};

/** Box — centralizado com largura configurável. */
export function moduleSectionBoxClass(maxContentWidth?: "narrow" | "normal" | "wide"): string {
  const mw = MAX_WIDTH_CLASS[maxContentWidth ?? "normal"];
  return `relative container mx-auto w-full ${mw} px-4 sm:px-6 lg:px-8`;
}

/** Largura total da viewport (conteúdo com padding lateral). */
export const MODULE_SECTION_FULL_BLEED_CLASS =
  "relative w-full px-4 sm:px-6 lg:px-8";

export const MODULE_SECTION_IN_SECTION_CLASS =
  "relative w-full px-4 sm:px-6 lg:px-8";

/** @deprecated use moduleSectionBoxClass — mantido para imports antigos. */
export const MODULE_SECTION_BOX_CLASS = moduleSectionBoxClass("wide");

/** @deprecated */
export const MODULE_SECTION_FULL_CLASS = moduleSectionBoxClass("wide");

/** Padding vertical conforme sectionSize do bloco. */
export function sectionPaddingClassFromBlock(block: HomeContentBlock): string {
  const size = (block.config?.sectionSize as "compact" | "normal" | "large") || "normal";
  if (size === "compact") return "py-8 sm:py-10";
  if (size === "large") return "py-20 sm:py-28";
  return "py-14 sm:py-20";
}

/** Container interno de módulo (portfolio / group-home). */
export function moduleSectionContainerClass(options?: {
  fullWidth?: boolean;
  inSection?: boolean;
  forceBox?: boolean;
  maxContentWidth?: "narrow" | "normal" | "wide";
}): string {
  if (options?.inSection) return MODULE_SECTION_IN_SECTION_CLASS;
  if (options?.fullWidth === true && !options?.forceBox) {
    return MODULE_SECTION_FULL_BLEED_CLASS;
  }
  return moduleSectionBoxClass(options?.maxContentWidth ?? (options?.fullWidth === false ? "normal" : "wide"));
}
