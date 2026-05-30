/** Linha da letra do hino (karaoke). */
export interface HinoLyricLine {
  text: string;
  /** Timestamps LRC (pode haver vários na mesma linha — refrão). */
  startSecs: number[];
  isSection: boolean;
}

export interface ParsedHinoLyrics {
  lines: HinoLyricLine[];
  hasTimestamps: boolean;
  /** Segundo no áudio em que a letra recomeça (segunda intro). Linha `[restart:1:32]` ou editor. */
  restartAtSec: number | null;
}

/** Interpreta "00:00:17", "0:17", "1:23.5" → segundos. */
export function parseLrcTimeValue(raw: string): number | null {
  const inner = raw.trim().replace(",", ".");
  if (!inner || /restart/i.test(inner)) return null;

  const parts = inner.split(":").map((p) => p.trim());
  if (parts.length === 3) {
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    const s = Number(parts[2]);
    if ([h, m, s].some((n) => Number.isNaN(n))) return null;
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const m = Number(parts[0]);
    const s = Number(parts[1]);
    if ([m, s].some((n) => Number.isNaN(n))) return null;
    return m * 60 + s;
  }
  const n = Number(inner);
  return Number.isNaN(n) ? null : n;
}

function parseRestartFromTag(inner: string): number | null {
  const m = inner.match(/^restart(?::(.+))?$/i);
  if (!m) return null;
  const spec = m[1]?.trim();
  if (!spec) return null;
  return parseLrcTimeValue(spec);
}

/** Extrai tags [tempo] do início da linha. Suporta [00:00:17] e [0:17]. */
function extractLeadingTimeTags(line: string): {
  times: number[];
  restartAt: number | null;
  text: string;
} {
  const times: number[] = [];
  let restartAt: number | null = null;
  let remaining = line.trim();

  while (remaining.startsWith("[")) {
    const close = remaining.indexOf("]");
    if (close === -1) break;
    const inner = remaining.slice(1, close);
    remaining = remaining.slice(close + 1).trimStart();

    const restart = parseRestartFromTag(inner);
    if (restart != null) {
      restartAt = restart;
      continue;
    }
    const sec = parseLrcTimeValue(inner);
    if (sec != null) times.push(sec);
    else break;
  }

  return { times, restartAt, text: remaining.trim() };
}

/** Interpreta letra com timestamps LRC ([hh:mm:ss] ou [mm:ss]). */
export function parseHinoLyrics(raw: string): ParsedHinoLyrics {
  const rows = raw.split("\n");
  const lines: HinoLyricLine[] = [];
  let hasTimestamps = false;
  let restartAtSec: number | null = null;

  for (const row of rows) {
    const trimmed = row.trim();
    if (!trimmed) continue;

    const { times, restartAt, text } = extractLeadingTimeTags(trimmed);
    if (restartAt != null) restartAtSec = restartAt;

    if (times.length > 0) {
      hasTimestamps = true;
      if (!text) continue;
      lines.push({
        text,
        startSecs: times,
        isSection: /^\[.+\]$/.test(text),
      });
      continue;
    }

    if (!text) continue;
    lines.push({
      text,
      startSecs: [],
      isSection: /^\[.+\]$/.test(text),
    });
  }

  return { lines, hasTimestamps, restartAtSec };
}

function singableLines(lines: HinoLyricLine[]): HinoLyricLine[] {
  return lines.filter((l) => !l.isSection && l.startSecs.length > 0);
}

function firstVocalTime(lines: HinoLyricLine[]): number {
  let min = Infinity;
  for (const line of lines) {
    if (line.isSection) continue;
    for (const t of line.startSecs) {
      if (t < min) min = t;
    }
  }
  return Number.isFinite(min) ? min : 0;
}

/** Tempo efetivo para LRC (inclui reinício da letra na segunda intro). */
export function effectiveLrcSyncSec(
  currentSec: number,
  lines: HinoLyricLine[],
  restartAtSec: number | null,
  leadSec: number,
): number {
  let sync = currentSec;
  if (restartAtSec != null && currentSec >= restartAtSec) {
    sync = currentSec - restartAtSec + firstVocalTime(lines);
  }
  return Math.max(0, sync + leadSec);
}

/** Índice da linha ativa com timestamps LRC. */
export function activeLineIndexFromLrc(lines: HinoLyricLine[], syncSec: number): number {
  type Ev = { time: number; index: number };
  const events: Ev[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.isSection) continue;
    for (const t of line.startSecs) events.push({ time: t, index: i });
  }
  if (events.length === 0) return -1;
  events.sort((a, b) => a.time - b.time);
  if (syncSec < events[0]!.time) return -1;

  let active = -1;
  for (const ev of events) {
    if (syncSec >= ev.time) active = ev.index;
    else break;
  }
  return active;
}

/** Índice estimado (sem LRC). */
export function activeLineIndexEstimated(
  lines: HinoLyricLine[],
  syncSec: number,
  durationSec: number,
  introSec: number,
): number {
  if (durationSec <= 0 || syncSec < introSec) return -1;

  const singable = lines.filter((l) => !l.isSection);
  if (singable.length === 0) return -1;

  const outroReserve = Math.min(durationSec * 0.08, 6);
  const usable = Math.max(0.5, durationSec - introSec - outroReserve);
  const t = Math.min(usable, syncSec - introSec);
  const weights = singable.map((l) => {
    const words = l.text.split(/\s+/).filter(Boolean).length;
    return Math.max(words, 2);
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let elapsed = 0;
  for (let i = 0; i < singable.length; i++) {
    elapsed += (weights[i]! / totalWeight) * usable;
    if (t < elapsed) return lines.indexOf(singable[i]!);
  }
  return lines.indexOf(singable[singable.length - 1]!);
}

export function resolveActiveLineIndex(
  lines: HinoLyricLine[],
  currentSec: number,
  durationSec: number,
  hasTimestamps: boolean,
  introSec: number,
  leadSec = 0,
  restartAtSec: number | null = null,
): number {
  if (lines.length === 0) return -1;
  if (hasTimestamps) {
    const syncSec = effectiveLrcSyncSec(currentSec, lines, restartAtSec, leadSec);
    return activeLineIndexFromLrc(lines, syncSec);
  }
  const syncSec = Math.max(0, currentSec + leadSec);
  return activeLineIndexEstimated(lines, syncSec, durationSec, introSec);
}

export const HINO_KARAOKE_DEFAULT_INTRO_SEC = 3;
export const HINO_KARAOKE_DEFAULT_LEAD_SEC = 2.5;

export function parseHinoKaraokeIntroSec(raw: unknown): number {
  if (typeof raw === "number" && raw >= 0) return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  return HINO_KARAOKE_DEFAULT_INTRO_SEC;
}

export function parseHinoKaraokeLeadSec(raw: unknown, hasLrc?: boolean): number {
  const unset = raw === undefined || raw === null || raw === "";
  if (unset && hasLrc) return 0;
  if (typeof raw === "number") return Math.max(0, Math.min(10, raw));
  if (typeof raw === "string") {
    const n = Number(raw);
    if (!Number.isNaN(n)) return Math.max(0, Math.min(10, n));
  }
  return HINO_KARAOKE_DEFAULT_LEAD_SEC;
}

export function parseHinoKaraokeRestartSec(
  fromLyrics: number | null,
  configRaw: unknown,
): number | null {
  if (typeof configRaw === "number" && configRaw >= 0) return configRaw;
  if (typeof configRaw === "string") {
    const n = Number(configRaw);
    if (!Number.isNaN(n) && n >= 0) return n;
    const parsed = parseLrcTimeValue(configRaw);
    if (parsed != null) return parsed;
  }
  return fromLyrics;
}
