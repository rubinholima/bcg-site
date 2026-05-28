/** Linha separadora sutil abaixo do módulo (`border-b border-white/5`) — opcional via editor. */
export function moduleBottomBorderClass(
  config: Record<string, unknown> | undefined | null,
): string {
  const v = config?.showModuleBorder;
  if (v === true || v === "true") return "border-b border-white/5";
  return "";
}
