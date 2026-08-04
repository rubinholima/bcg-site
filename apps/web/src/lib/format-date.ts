/**
 * Formato oficial BCG para datas de exibição: 26 AGO 2026
 */

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

function partsFromValue(value: string | Date): {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
} | null {
  if (typeof value === "string") {
    const ymdHm = value.match(
      /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2}))?/,
    );
    if (ymdHm) {
      return {
        year: Number(ymdHm[1]),
        month: Number(ymdHm[2]),
        day: Number(ymdHm[3]),
        hour: ymdHm[4] != null ? Number(ymdHm[4]) : undefined,
        minute: ymdHm[5] != null ? Number(ymdHm[5]) : undefined,
      };
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    value = date;
  }
  if (Number.isNaN(value.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(value);
  const pick = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return {
    year: Number(pick("year")),
    month: Number(pick("month")),
    day: Number(pick("day")),
    hour: Number(pick("hour")),
    minute: Number(pick("minute")),
  };
}

/**
 * Data — ex.: 26 AGO 2026
 */
export function formatDateDayMonYear(
  value: string | Date | null | undefined,
): string {
  if (value == null || value === "") return "—";
  try {
    const p = partsFromValue(value);
    if (!p || !p.year || !p.month || !p.day || p.month < 1 || p.month > 12) {
      return "—";
    }
    return `${String(p.day).padStart(2, "0")} ${MONTHS_PT_SHORT[p.month - 1]} ${p.year}`;
  } catch {
    return "—";
  }
}

/**
 * Mês + ano — ex.: AGO 2026 (cabeçalhos de calendário)
 */
export function formatMonthYear(
  value: string | Date | null | undefined,
): string {
  if (value == null || value === "") return "—";
  try {
    const p = partsFromValue(value);
    if (!p || !p.year || !p.month || p.month < 1 || p.month > 12) return "—";
    return `${MONTHS_PT_SHORT[p.month - 1]} ${p.year}`;
  } catch {
    return "—";
  }
}

/**
 * Data + hora — ex.: 26 AGO 2026 · 14:30
 */
export function formatDateTimeDayMonYear(
  value: string | Date | null | undefined,
): string {
  if (value == null || value === "") return "—";
  try {
    const p = partsFromValue(value);
    if (!p || !p.year || !p.month || !p.day || p.month < 1 || p.month > 12) {
      return "—";
    }
    const date = `${String(p.day).padStart(2, "0")} ${MONTHS_PT_SHORT[p.month - 1]} ${p.year}`;
    if (p.hour == null || p.minute == null || Number.isNaN(p.hour)) return date;
    return `${date} · ${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
  } catch {
    return "—";
  }
}

/** Alias — padrão oficial do app. */
export function formatDateLocal(
  value: string | Date | null | undefined,
  _options?: Intl.DateTimeFormatOptions,
): string {
  const formatted = formatDateDayMonYear(value);
  return formatted === "—" ? "" : formatted;
}

/** Alias — data + hora no padrão oficial. */
export function formatDateTimeLocal(
  value: string | Date | null | undefined,
  _options?: Intl.DateTimeFormatOptions,
): string {
  const formatted = formatDateTimeDayMonYear(value);
  return formatted === "—" ? "" : formatted;
}
