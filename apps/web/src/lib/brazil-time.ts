/** Horário oficial BCG — America/Sao_Paulo. */

export const BRAZIL_TZ = "America/Sao_Paulo";

function datePartsInTz(d: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const pick = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour"),
    minute: pick("minute"),
  };
}

export function dateKeyInBrazil(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const { year, month, day } = datePartsInTz(date, BRAZIL_TZ);
  return `${year}-${month}-${day}`;
}

export function timeInBrazil(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const { hour, minute } = datePartsInTz(date, BRAZIL_TZ);
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

export function combineDateTimeBrazil(date: string, time: string, allDay: boolean): string {
  if (!date) return "";
  if (allDay) return new Date(`${date}T12:00:00-03:00`).toISOString();
  return new Date(`${date}T${time}:00-03:00`).toISOString();
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const d = new Date(`${dateKey.slice(0, 10)}T12:00:00-03:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return dateKeyInBrazil(d);
}

/** ISO ou Date → valor para input datetime-local (sempre horário de São Paulo). */
export function toDateTimeLocalBrazil(v: string | Date | null | undefined): string {
  if (!v) return "";
  const trimmed = typeof v === "string" ? v.trim() : "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) return trimmed;
  const date = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(date.getTime())) return "";
  const { year, month, day, hour, minute } = datePartsInTz(date, BRAZIL_TZ);
  return `${year}-${month}-${day}T${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

/** datetime-local (sem fuso) ou ISO → ISO UTC (interpretando como São Paulo). */
export function parseDateTimeLocalBrazil(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const m = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const d = new Date(`${m[1]}T${m[2]}:${m[3]}:${m[4] ?? "00"}-03:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
