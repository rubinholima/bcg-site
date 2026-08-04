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

const MONTHS_PT_SHORT = [
  "JAN",
  "FEV",
  "MAR",
  "ABR",
  "MAI",
  "JUN",
  "JUL",
  "AGO",
  "SET",
  "OUT",
  "NOV",
  "DEZ",
] as const;

/**
 * Data operacional logística / convocação — ex.: 26 AGO 2026
 * Evita ambiguidade de 26/08 vs 08/26.
 */
export function formatDateDayMonYear(
  value: string | Date | null | undefined,
): string {
  if (!value) return "—";
  try {
    let year: number;
    let month: number;
    let day: number;

    if (typeof value === "string") {
      const ymd = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (ymd) {
        year = Number(ymd[1]);
        month = Number(ymd[2]);
        day = Number(ymd[3]);
      } else {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "—";
        const parts = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Sao_Paulo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).formatToParts(date);
        const pick = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
        year = Number(pick("year"));
        month = Number(pick("month"));
        day = Number(pick("day"));
      }
    } else {
      if (Number.isNaN(value.getTime())) return "—";
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(value);
      const pick = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
      year = Number(pick("year"));
      month = Number(pick("month"));
      day = Number(pick("day"));
    }

    if (!year || !month || !day || month < 1 || month > 12) return "—";
    return `${String(day).padStart(2, "0")} ${MONTHS_PT_SHORT[month - 1]} ${year}`;
  } catch {
    return "—";
  }
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
