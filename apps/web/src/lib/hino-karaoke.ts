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

/** Índice da linha ativa com timestamps LRC. */
export function activeLineIndexFromLrc(lines: HinoLyricLine[], currentSec: number): number {
  const timed = lines.filter((l) => !l.isSection && l.startSec != null);
  if (timed.length === 0) return -1;
  if (currentSec < (timed[0]!.startSec ?? 0)) return -1;

  let active = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.isSection || line.startSec == null) continue;
    if (currentSec >= line.startSec) active = i;
    else break;
  }
  return active;
}

/** Índice estimado por peso de caracteres + intro instrumental. */
export function activeLineIndexEstimated(
  lines: HinoLyricLine[],
  currentSec: number,
  durationSec: number,
  introSec: number,
): number {
  if (durationSec <= 0 || currentSec < introSec) return -1;

  const singable = singableLines(lines);
  if (singable.length === 0) return -1;

  const usable = Math.max(0.5, durationSec - introSec);
  const t = Math.min(usable, currentSec - introSec);
  const weights = singable.map((l) => Math.max(l.text.replace(/\s/g, "").length, 6));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let elapsed = 0;
  for (let i = 0; i < singable.length; i++) {
    const slice = (weights[i]! / totalWeight) * usable;
    elapsed += slice;
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
): number {
  if (lines.length === 0) return -1;
  if (hasTimestamps) return activeLineIndexFromLrc(lines, currentSec);
  return activeLineIndexEstimated(lines, currentSec, durationSec, introSec);
}
