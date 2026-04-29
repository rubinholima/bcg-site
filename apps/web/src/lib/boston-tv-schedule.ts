/**
 * Agenda semanal Boston TV.
 * `weekdays`: 1 = segunda … 7 = domingo (ISO-like com segunda = 1).
 * Fora de qualquer janela = blecaute (somente no player; não desliga a TV física).
 */

export type BostonTvWeeklyWindow = {
  weekdays: number[];
  start: string;
  end: string;
};

const DOW: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

function parseHHmm(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function nowDowAndMinutes(
  date: Date,
  timeZone: string,
): { dow: number; minutes: number } | null {
  try {
    const wdName = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long",
    }).format(date);
    const dow = DOW[wdName];
    if (!dow) return null;
    const hm = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
    const [hh, mm] = hm.split(":").map((x) => parseInt(x, 10));
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    return { dow, minutes: hh * 60 + mm };
  } catch {
    return null;
  }
}

/** Lista vazia ou null = conteúdo 24/7 (sem blecaute por horário). */
export function isWithinContentWindow(
  date: Date,
  weeklySchedule: unknown,
  timeZone: string,
): boolean {
  if (weeklySchedule === null || weeklySchedule === undefined) return true;
  if (!Array.isArray(weeklySchedule)) return true;
  if (weeklySchedule.length === 0) return true;

  const now = nowDowAndMinutes(date, timeZone);
  if (!now) return true;

  for (const raw of weeklySchedule) {
    if (!raw || typeof raw !== "object") continue;
    const w = raw as Partial<BostonTvWeeklyWindow>;
    if (
      !Array.isArray(w.weekdays) ||
      typeof w.start !== "string" ||
      typeof w.end !== "string"
    ) {
      continue;
    }
    if (!w.weekdays.includes(now.dow)) continue;

    const startM = parseHHmm(w.start);
    const endM = parseHHmm(w.end);
    if (startM === null || endM === null) continue;

    if (startM <= endM) {
      if (now.minutes >= startM && now.minutes <= endM) return true;
    } else {
      // cruza meia-noite
      if (now.minutes >= startM || now.minutes <= endM) return true;
    }
  }
  return false;
}
