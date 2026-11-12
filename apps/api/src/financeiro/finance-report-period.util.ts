import type { FinanceReportPeriodPreset } from './finance-report.types';

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function endOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

export function resolveReportPeriod(
  preset: FinanceReportPeriodPreset | undefined,
  startDate?: string,
  endDate?: string,
): { start: Date; end: Date } {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();

  if (preset === 'custom' && startDate && endDate) {
    return {
      start: startOfDay(new Date(`${startDate}T00:00:00.000Z`)),
      end: endOfDay(new Date(`${endDate}T00:00:00.000Z`)),
    };
  }

  switch (preset) {
    case 'this_week': {
      const day = now.getUTCDay();
      const diff = day === 0 ? 6 : day - 1;
      const mon = new Date(now);
      mon.setUTCDate(now.getUTCDate() - diff);
      const sun = new Date(mon);
      sun.setUTCDate(mon.getUTCDate() + 6);
      return { start: startOfDay(mon), end: endOfDay(sun) };
    }
    case 'last_week': {
      const day = now.getUTCDay();
      const diff = day === 0 ? 6 : day - 1;
      const thisMon = new Date(now);
      thisMon.setUTCDate(now.getUTCDate() - diff);
      const lastMon = new Date(thisMon);
      lastMon.setUTCDate(thisMon.getUTCDate() - 7);
      const lastSun = new Date(lastMon);
      lastSun.setUTCDate(lastMon.getUTCDate() + 6);
      return { start: startOfDay(lastMon), end: endOfDay(lastSun) };
    }
    case 'last_month': {
      const lm = m === 0 ? 11 : m - 1;
      const ly = m === 0 ? y - 1 : y;
      const start = new Date(Date.UTC(ly, lm, 1));
      const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
      return { start, end };
    }
    case 'this_semester': {
      const sm = m < 6 ? 0 : 6;
      const start = new Date(Date.UTC(y, sm, 1));
      const end = new Date(Date.UTC(y, sm + 6, 0, 23, 59, 59, 999));
      return { start, end };
    }
    case 'last_semester': {
      const inSecond = m >= 6;
      const sy = inSecond ? y : y - 1;
      const sm = inSecond ? 0 : 6;
      const start = new Date(Date.UTC(sy, sm, 1));
      const end = new Date(Date.UTC(sy, sm + 6, 0, 23, 59, 59, 999));
      return { start, end };
    }
    case 'this_year':
      return {
        start: new Date(Date.UTC(y, 0, 1)),
        end: new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999)),
      };
    case 'last_year':
      return {
        start: new Date(Date.UTC(y - 1, 0, 1)),
        end: new Date(Date.UTC(y - 1, 11, 31, 23, 59, 59, 999)),
      };
    case 'this_month':
    default:
      return {
        start: new Date(Date.UTC(y, m, 1)),
        end: new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999)),
      };
  }
}
