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
