/** Linha da letra do hino (karaoke). */
export interface HinoLyricLine {
  text: string;
  /** Segundo em que a linha entra (LRC). Null = timing estimado. */
  startSec: number | null;
  isSection: boolean;
}

const LRC_LINE_RE = /^\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]\s*(.*)$/;

function parseLrcSeconds(min: string, sec: string, frac?: string): number {
  const f = frac ? Number(frac.padEnd(3, "0").slice(0, 3)) / 1000 : 0;
  return Number(min) * 60 + Number(sec) + f;
}

/** Interpreta letra com timestamps LRC opcionais ([mm:ss.xx] texto). */
export function parseHinoLyrics(raw: string): { lines: HinoLyricLine[]; hasTimestamps: boolean } {
  const rows = raw.split("\n");
  const lines: HinoLyricLine[] = [];
  let hasTimestamps = false;

  for (const row of rows) {
    const trimmed = row.trim();
    if (!trimmed) continue;

    const lrc = trimmed.match(LRC_LINE_RE);
    if (lrc) {
      const text = (lrc[4] ?? "").trim();
      const startSec = parseLrcSeconds(lrc[1]!, lrc[2]!, lrc[3]);
      hasTimestamps = true;
      if (!text) continue;
      lines.push({
        text,
        startSec,
        isSection: /^\[.+\]$/.test(text),
      });
      continue;
    }

    lines.push({
      text: trimmed,
      startSec: null,
      isSection: /^\[.+\]$/.test(trimmed),
    });
  }

  return { lines, hasTimestamps };
}

function singableLines(lines: HinoLyricLine[]): HinoLyricLine[] {
  return lines.filter((l) => !l.isSection);
}

/** Índice da linha ativa com timestamps LRC (+ adiantamento opcional). */
export function activeLineIndexFromLrc(lines: HinoLyricLine[], syncSec: number): number {
  const timed = lines.filter((l) => !l.isSection && l.startSec != null);
  if (timed.length === 0) return -1;
  if (syncSec < (timed[0]!.startSec ?? 0)) return -1;

  let active = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.isSection || line.startSec == null) continue;
    if (syncSec >= line.startSec) active = i;
    else break;
  }
  return active;
}

/** Índice estimado por peso de palavras + intro + adiantamento. */
export function activeLineIndexEstimated(
  lines: HinoLyricLine[],
  syncSec: number,
  durationSec: number,
  introSec: number,
): number {
  if (durationSec <= 0 || syncSec < introSec) return -1;

  const singable = singableLines(lines);
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
    if (t < elapsed) {
      return lines.indexOf(singable[i]!);
    }
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
): number {
  if (lines.length === 0) return -1;
  const syncSec = Math.max(0, currentSec + leadSec);
  if (hasTimestamps) return activeLineIndexFromLrc(lines, syncSec);
  return activeLineIndexEstimated(lines, syncSec, durationSec, introSec);
}

/** Defaults quando o editor não define valores. */
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

export function parseHinoKaraokeLeadSec(raw: unknown): number {
  if (typeof raw === "number") return Math.max(0, Math.min(10, raw));
  if (typeof raw === "string") {
    const n = Number(raw);
    if (!Number.isNaN(n)) return Math.max(0, Math.min(10, n));
  }
  return HINO_KARAOKE_DEFAULT_LEAD_SEC;
}
