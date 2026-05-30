/** Box — igual ao módulo Equipes (centralizado, max-w-7xl). */
export const MODULE_SECTION_BOX_CLASS =
  "relative container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8";

/** Full width com conteúdo alinhado à mesma régua lateral (max-w-7xl). */
export const MODULE_SECTION_FULL_CLASS =
  "relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8";

export const MODULE_SECTION_IN_SECTION_CLASS =
  "relative w-full px-4 sm:px-6 lg:px-8";

/** Container interno de módulo (portfolio / group-home). */
export function moduleSectionContainerClass(options?: {
  fullWidth?: boolean;
  inSection?: boolean;
  /** Sempre box (ex.: hino alinhado ao Equipes), mesmo com tema full. */
  forceBox?: boolean;
}): string {
  if (options?.inSection) return MODULE_SECTION_IN_SECTION_CLASS;
  if (options?.forceBox || options?.fullWidth === false) {
    return MODULE_SECTION_BOX_CLASS;
  }
  if (options?.fullWidth === true) {
    return MODULE_SECTION_FULL_CLASS;
  }
  return MODULE_SECTION_BOX_CLASS;
}
