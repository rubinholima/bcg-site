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
  /** Segundo no áudio em que a reprise instrumental começa. Linha `[restart:1:32]` ou editor. */
  restartAtSec: number | null;
  /** Duração da intro da reprise antes da letra voltar (seg). `[restart:1:32+15]` ou editor. */
  restartIntroSec: number | null;
}

export type HinoKaraokeDisplayPhase = "idle" | "intro" | "interlude" | "lyrics";

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

function parseRestartFromTag(inner: string): { at: number | null; introSec: number | null } {
  const m = inner.match(/^restart(?::(.+))?$/i);
  if (!m) return { at: null, introSec: null };
  const spec = m[1]?.trim();
  if (!spec) return { at: null, introSec: null };

  const parts = spec.split(/[+]/).map((p) => p.trim());
  const at = parseLrcTimeValue(parts[0] ?? "");
  const introSec = parts[1] ? parseLrcTimeValue(parts[1]) : null;
  return { at, introSec };
}

/** Extrai tags [tempo] do início da linha. Suporta [00:00:17] e [0:17]. */
function extractLeadingTimeTags(line: string): {
  times: number[];
  restartAt: number | null;
  restartIntroSec: number | null;
  text: string;
} {
  const times: number[] = [];
  let restartAt: number | null = null;
  let restartIntroSec: number | null = null;
  let remaining = line.trim();

  while (remaining.startsWith("[")) {
    const close = remaining.indexOf("]");
    if (close === -1) break;
    const inner = remaining.slice(1, close);
    remaining = remaining.slice(close + 1).trimStart();

    const restart = parseRestartFromTag(inner);
    if (restart.at != null) {
      restartAt = restart.at;
      if (restart.introSec != null) restartIntroSec = restart.introSec;
      continue;
    }
    const sec = parseLrcTimeValue(inner);
    if (sec != null) times.push(sec);
    else break;
  }

  return { times, restartAt, restartIntroSec, text: remaining.trim() };
}

/** Interpreta letra com timestamps LRC ([hh:mm:ss] ou [mm:ss]). */
export function parseHinoLyrics(raw: string): ParsedHinoLyrics {
  const rows = raw.split("\n");
  const lines: HinoLyricLine[] = [];
  let hasTimestamps = false;
  let restartAtSec: number | null = null;
  let restartIntroSec: number | null = null;

  for (const row of rows) {
    const trimmed = row.trim();
    if (!trimmed) continue;

    const { times, restartAt, restartIntroSec: rowIntro, text } = extractLeadingTimeTags(trimmed);
    if (restartAt != null) restartAtSec = restartAt;
    if (rowIntro != null) restartIntroSec = rowIntro;

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

  return { lines, hasTimestamps, restartAtSec, restartIntroSec };
}

function singableLines(lines: HinoLyricLine[]): HinoLyricLine[] {
  return lines.filter((l) => !l.isSection && l.startSecs.length > 0);
}

export function firstVocalTime(lines: HinoLyricLine[]): number {
  let min = Infinity;
  for (const line of lines) {
    if (line.isSection) continue;
    for (const t of line.startSecs) {
      if (t < min) min = t;
    }
  }
  return Number.isFinite(min) ? min : 0;
}

export function lastVocalTime(lines: HinoLyricLine[]): number {
  let max = 0;
  for (const line of lines) {
    if (line.isSection) continue;
    for (const t of line.startSecs) {
      if (t > max) max = t;
    }
  }
  return max;
}

/** Quando começa o interlúdio (após última linha, antes da reprise). */
function interludeStartSec(lines: HinoLyricLine[], restartAtSec: number): number {
  const lastV = lastVocalTime(lines);
  const gap = restartAtSec - lastV;
  if (gap <= 0) return restartAtSec;
  const holdLastLine = Math.min(5, Math.max(2, gap * 0.35));
  return lastV + holdLastLine;
}

function isInPreRestartInterlude(
  currentSec: number,
  lines: HinoLyricLine[],
  restartAtSec: number | null,
): boolean {
  if (restartAtSec == null) return false;
  return currentSec >= interludeStartSec(lines, restartAtSec) && currentSec < restartAtSec;
}

/** Tempo efetivo para LRC (inclui reinício da letra na segunda intro). */
export function effectiveLrcSyncSec(
  currentSec: number,
  lines: HinoLyricLine[],
  restartAtSec: number | null,
  restartIntroSec: number,
  leadSec: number,
  _durationSec = 0,
): number {
  let sync = currentSec;

  if (restartAtSec != null && currentSec >= restartAtSec) {
    const introDur = Math.max(0, restartIntroSec);
    const lyricsResumeAt = restartAtSec + introDur;

    if (introDur > 0 && currentSec < lyricsResumeAt) {
      /** Instrumental da reprise — mesma 1ª linha do início. */
      sync = firstVocalTime(lines);
    } else {
      /** 2ª passagem: relógio LRC idêntico à 1ª (1s de áudio = 1s na letra). */
      sync = currentSec - lyricsResumeAt + firstVocalTime(lines);
    }
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
  restartIntroSec = 0,
): number {
  if (lines.length === 0) return -1;
  if (hasTimestamps && isInPreRestartInterlude(currentSec, lines, restartAtSec)) {
    return -1;
  }
  if (hasTimestamps) {
    const syncSec = effectiveLrcSyncSec(
      currentSec,
      lines,
      restartAtSec,
      restartIntroSec,
      leadSec,
      durationSec,
    );
    return activeLineIndexFromLrc(lines, syncSec);
  }
  const syncSec = Math.max(0, currentSec + leadSec);
  return activeLineIndexEstimated(lines, syncSec, durationSec, introSec);
}

export function resolveHinoKaraokeDisplayPhase(
  playing: boolean,
  currentSec: number,
  lines: HinoLyricLine[],
  hasTimestamps: boolean,
  restartAtSec: number | null,
  restartIntroSec: number,
  activeLineIndex: number,
  durationSec = 0,
): HinoKaraokeDisplayPhase {
  const atEnd = durationSec > 0 && currentSec >= durationSec - 0.35;

  if (!playing) {
    if (atEnd || activeLineIndex < 0) return "idle";
    return "lyrics";
  }
  if (!hasTimestamps) {
    if (activeLineIndex < 0) return playing ? "intro" : "idle";
    return "lyrics";
  }
  if (restartAtSec != null && playing && isInPreRestartInterlude(currentSec, lines, restartAtSec)) {
    return "interlude";
  }
  if (playing && activeLineIndex < 0) return "intro";
  return activeLineIndex >= 0 ? "lyrics" : "idle";
}

export const HINO_KARAOKE_DEFAULT_INTRO_SEC = 3;
export const HINO_KARAOKE_DEFAULT_LEAD_SEC = 2.5;
/** Intro instrumental da reprise quando `[restart:…]` sem `+segundos`. */
export const HINO_KARAOKE_DEFAULT_RESTART_INTRO_SEC = 15;

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

export function parseHinoKaraokeRestartIntroSec(
  fromLyrics: number | null,
  configRaw: unknown,
  lines: HinoLyricLine[],
): number {
  const unset = configRaw === undefined || configRaw === null || configRaw === "";
  if (!unset) {
    if (typeof configRaw === "number" && configRaw >= 0) return configRaw;
    if (typeof configRaw === "string") {
      const n = Number(configRaw);
      if (!Number.isNaN(n) && n >= 0) return n;
      const parsed = parseLrcTimeValue(configRaw);
      if (parsed != null) return parsed;
    }
  }
  if (fromLyrics != null && fromLyrics >= 0) return fromLyrics;
  const first = firstVocalTime(lines);
  return first > 0 ? first : HINO_KARAOKE_DEFAULT_RESTART_INTRO_SEC;
}
