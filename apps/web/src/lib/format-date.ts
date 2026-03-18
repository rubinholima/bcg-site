/**
 * Formata datas para exibição seguindo o padrão local (regionalização).
 * Usa navigator.language (browser) ou document.documentElement.lang (ex: pt-BR) como fallback.
 */

function getLocale(): string {
  if (typeof navigator !== "undefined" && navigator.language) {
    return navigator.language;
  }
  if (typeof document !== "undefined" && document.documentElement?.lang) {
    return document.documentElement.lang;
  }
  return "pt-BR";
}

/**
 * Formata uma data (YYYY-MM-DD ou ISO string) para exibição no locale do usuário.
 * Ex: pt-BR → 17/03/2026 | en-US → 3/17/2026
 */
export function formatDateLocal(
  value: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return "";
  try {
    const date = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return String(value);
    const locale = getLocale();
    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      ...options,
    };
    return new Intl.DateTimeFormat(locale, defaultOptions).format(date);
  } catch {
    return String(value);
  }
}

/**
 * Formata data + hora no locale do usuário.
 */
export function formatDateTimeLocal(
  value: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return "";
  try {
    const date = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return String(value);
    const locale = getLocale();
    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      ...options,
    };
    return new Intl.DateTimeFormat(locale, defaultOptions).format(date);
  } catch {
    return String(value);
  }
}
