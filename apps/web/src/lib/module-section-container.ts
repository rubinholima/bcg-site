/** Largura e padding horizontal padrão dos módulos públicos — títulos e conteúdo alinhados entre seções. */
export const MODULE_SECTION_INNER_CLASS =
  "relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8";

export const MODULE_SECTION_IN_SECTION_CLASS =
  "relative w-full px-4 sm:px-6 lg:px-8";

/** Container interno de módulo (portfolio / group-home). */
export function moduleSectionContainerClass(options?: {
  inSection?: boolean;
}): string {
  if (options?.inSection) return MODULE_SECTION_IN_SECTION_CLASS;
  return MODULE_SECTION_INNER_CLASS;
}
