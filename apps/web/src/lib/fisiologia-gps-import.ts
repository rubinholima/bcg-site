import * as XLSX from "xlsx";

export type GpsImportRosterPlayer = {
  id: string;
  name: string;
  jerseyNumber: number | null;
  registrationProfile?: unknown;
};

export type GpsImportFieldKey =
  | "playerName"
  | "maxDistanceM"
  | "maxSpeedKmh"
  | "sprintCount"
  | "highIntensityDistanceM"
  | "lowIntensityDistanceM"
  | "sprintDistanceM"
  | "accelerations"
  | "decelerations"
  | "rpe"
  | "trainingMinutes"
  | "gameMinutes";

export type GpsImportRowPatch = Partial<Record<GpsImportFieldKey, number | string | null>> & {
  present?: boolean;
  gpsImportLabel?: string;
  gpsData?: Record<string, unknown>;
};

export type GpsImportSessionHints = {
  sessionDate?: string;
  sessionType?: "treino" | "jogo";
  sessionLabel?: string;
  trainingType?: string;
  opponentName?: string;
  homeTeam?: string;
  awayTeam?: string;
  sourceFileName?: string;
  detectedSheets?: string[];
  fixtureKey?: string;
};

export type GpsAthleteMatchRow = {
  workbookLabel: string;
  status: "matched" | "unmatched" | "ambiguous";
  playerId?: string;
  playerName?: string;
  candidates?: Array<{ id: string; name: string }>;
};

export type GpsImportResult = {
  matched: number;
  withGpsData: number;
  unmatched: string[];
  ambiguous: Array<{ label: string; candidates: Array<{ id: string; name: string }> }>;
  athleteMatches: GpsAthleteMatchRow[];
  patches: Map<string, GpsImportRowPatch>;
  pendingPatches: Map<string, GpsImportRowPatch>;
  sessionHints: GpsImportSessionHints;
  workbookAthleteCount: number;
};

/** Aliases para colar Summary legado — chaves normalizadas. */
export const GPS_FIELD_ALIASES: Record<string, GpsImportFieldKey> = {
  nome: "playerName",
  atleta: "playerName",
  player: "playerName",
  jogador: "playerName",
  nickname: "playerName",
  nickname2: "playerName",
  maxdistance: "maxDistanceM",
  distanciamax: "maxDistanceM",
  distancem: "maxDistanceM",
  distance: "maxDistanceM",
  totaldistance: "maxDistanceM",
  maxspeed: "maxSpeedKmh",
  maxspeedkmh: "maxSpeedKmh",
  velocidademax: "maxSpeedKmh",
  sprintcount: "sprintCount",
  sprints: "sprintCount",
  sprintabscnt: "sprintCount",
  accelerations: "accelerations",
  decelerations: "decelerations",
  positioningduration: "trainingMinutes",
  drillsduration: "trainingMinutes",
  rpe: "rpe",
  pse: "rpe",
  trainingminutes: "trainingMinutes",
  gameminutes: "gameMinutes",
};

const HUD_METRIC_SHEETS = ["distance", "acceleration", "hse"] as const;

const PLAYER_NAME_KEYS = ["player", "nome", "atleta", "jogador"] as const;
const NICKNAME_KEYS = ["nickname", "nick name", "apelido", "nick"] as const;

const DISTANCE_M_HEADERS = ["distance(m)", "distance m"];
const LOW_INTENSITY_M_HEADERS = ["[6,00-12,00]km/h (m)"];
const HIGH_INTENSITY_M_HEADERS = ["[12,00-18,00]km/h (m)"];
const POSITIONING_DURATION_HEADERS = ["positioning duration", "drills duration"];
const ACCELERATIONS_HEADERS = ["accelerations"];
const DECELERATIONS_HEADERS = ["decelerations"];
const SPRINT_ABS_CNT_HEADERS = ["sprint abs cnt"];
const MAX_SPEED_HEADERS = ["max speed(km/h)", "max speed km/h"];

/** Fallback por letra quando o header HUD padrão estiver na coluna esperada. */
const SHEET_COLUMN_FALLBACK: Record<
  (typeof HUD_METRIC_SHEETS)[number],
  Partial<Record<GpsImportFieldKey, string>>
> = {
  distance: {
    trainingMinutes: "D",
    maxDistanceM: "E",
    lowIntensityDistanceM: "O",
    highIntensityDistanceM: "P",
  },
  acceleration: {
    accelerations: "D",
    decelerations: "E",
  },
  hse: {
    sprintCount: "D",
    maxSpeedKmh: "P",
  },
};

type WorkbookPlayerMetrics = Record<string, string | number | null>;

export function normalizeGpsKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizePlayerSearchName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function extractPlayerNickname(registrationProfile: unknown): string | null {
  if (!registrationProfile || typeof registrationProfile !== "object" || Array.isArray(registrationProfile)) {
    return null;
  }
  const personal = (registrationProfile as Record<string, unknown>).personal;
  if (!personal || typeof personal !== "object" || Array.isArray(personal)) return null;
  const nickname = (personal as Record<string, unknown>).nickname;
  return typeof nickname === "string" && nickname.trim() ? nickname.trim() : null;
}

function rosterSearchKeys(player: GpsImportRosterPlayer): string[] {
  const keys = new Set<string>();
  const full = normalizePlayerSearchName(player.name);
  if (full) keys.add(full);
  const nickname = extractPlayerNickname(player.registrationProfile);
  if (nickname) keys.add(normalizePlayerSearchName(nickname));
  const tokens = full.split(" ").filter(Boolean);
  if (tokens.length >= 2) {
    keys.add(`${tokens[0]} ${tokens[tokens.length - 1]}`);
  }
  return [...keys];
}

export type AthleteMatchResult =
  | { status: "matched"; player: GpsImportRosterPlayer }
  | { status: "unmatched" }
  | { status: "ambiguous"; candidates: GpsImportRosterPlayer[] };

export function resolveAthleteMatch(
  label: string,
  roster: GpsImportRosterPlayer[],
): AthleteMatchResult {
  const norm = normalizePlayerSearchName(label);
  if (!norm || norm.length < 2) return { status: "unmatched" };

  const exact = roster.filter((p) => rosterSearchKeys(p).includes(norm));
  if (exact.length === 1) return { status: "matched", player: exact[0]! };
  if (exact.length > 1) return { status: "ambiguous", candidates: exact };

  const tokens = norm.split(" ").filter((t) => t.length >= 2);
  const lastName = tokens[tokens.length - 1] ?? "";
  const firstName = tokens[0] ?? "";

  if (lastName.length >= 3 && firstName.length >= 2) {
    const byFirstLast = roster.filter((p) => {
      const pNorm = normalizePlayerSearchName(p.name);
      const pTokens = pNorm.split(" ").filter(Boolean);
      return pTokens[0] === firstName && pTokens[pTokens.length - 1] === lastName;
    });
    if (byFirstLast.length === 1) return { status: "matched", player: byFirstLast[0]! };
    if (byFirstLast.length > 1) return { status: "ambiguous", candidates: byFirstLast };
  }

  if (lastName.length >= 4) {
    const byLast = roster.filter((p) => {
      const pNorm = normalizePlayerSearchName(p.name);
      return pNorm.endsWith(` ${lastName}`) || pNorm.split(" ").pop() === lastName;
    });
    if (byLast.length === 1) return { status: "matched", player: byLast[0]! };
    if (byLast.length > 1) return { status: "ambiguous", candidates: byLast };
  }

  return { status: "unmatched" };
}

/** @deprecated use resolveAthleteMatch */
export function matchPlayerName(
  name: string,
  roster: GpsImportRosterPlayer[],
): GpsImportRosterPlayer | null {
  const result = resolveAthleteMatch(name, roster);
  return result.status === "matched" ? result.player : null;
}

export function parseNum(value: string | undefined): number | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const n = Number(trimmed.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function parseDurationMinutes(value: string | undefined): number | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const timeMatch = /^(\d+):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (timeMatch) {
    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    const seconds = timeMatch[3] ? Number(timeMatch[3]) : 0;
    if ([hours, minutes, seconds].every(Number.isFinite)) {
      return Math.round(hours * 60 + minutes + seconds / 60);
    }
  }
  const n = parseNum(trimmed);
  return n != null ? Math.round(n) : null;
}

export function parseCsvLine(line: string): string[] {
  if (line.includes("\t")) return line.split("\t").map((c) => c.trim());
  return line.split(/[,;]/).map((c) => c.trim());
}

function parseHudDateToIso(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (br) {
    const [, d, m, y] = br;
    return `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }
  const iso = /^\d{4}-\d{2}-\d{2}$/.exec(value.trim());
  if (iso) return value.trim();
  return undefined;
}

function letterToIndex(letter: string): number {
  return letter.toUpperCase().charCodeAt(0) - 65;
}

function headerMatchesAny(header: string, candidates: string[]): boolean {
  const norm = normalizeGpsKey(header);
  return candidates.some((c) => norm === normalizeGpsKey(c));
}

function isDistanceMeterHeader(header: string): boolean {
  const norm = normalizeGpsKey(header);
  if (norm.includes("cnt")) return false;
  if (norm.includes("6001200") && norm.includes("m")) return true;
  if (norm.includes("12001800") && norm.includes("m")) return true;
  return headerMatchesAny(header, [...DISTANCE_M_HEADERS, ...LOW_INTENSITY_M_HEADERS, ...HIGH_INTENSITY_M_HEADERS]);
}

function findColumnIndex(
  headers: string[],
  names: string[],
  fallbackLetter?: string,
  predicate?: (header: string) => boolean,
): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i] ?? "";
    if (predicate?.(h)) return i;
    if (headerMatchesAny(h, names)) return i;
  }
  if (fallbackLetter) return letterToIndex(fallbackLetter);
  return -1;
}

function isSkippablePlayerLabel(label: string): boolean {
  const norm = normalizeGpsKey(label);
  if (
    !norm ||
    norm === "player" ||
    norm === "session" ||
    norm === "team" ||
    norm === "drills" ||
    norm === "treinocompleto" ||
    norm.startsWith("treino") ||
    norm === "1otempo" ||
    norm === "1atempo" ||
    norm === "2otempo" ||
    norm === "2tempo" ||
    norm === "2" ||
    /^[12]$/.test(norm)
  ) {
    return true;
  }
  // Cabeçalhos de período HUD (ex.: "1º Tempo", "1Âº Tempo")
  if (/^1.*tempo$/.test(norm) || /^2.*tempo$/.test(norm)) return true;
  return false;
}

function sheetRows(workbook: XLSX.WorkBook, sheetName: string): string[][] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as string[][];
}

function findSheet(workbook: XLSX.WorkBook, key: string): string | undefined {
  return workbook.SheetNames.find((name) => normalizeGpsKey(name) === key);
}

export function parseFilenameSessionHints(fileName: string): GpsImportSessionHints {
  const hints: GpsImportSessionHints = { sourceFileName: fileName };
  const base = fileName.replace(/\.xlsx?$/i, "").trim();

  const gameMatch = /^(\d{4})_(\d{1,2})_(\d{1,2})_(.+)_x_(.+)$/i.exec(base);
  if (gameMatch) {
    const [, y, m, d, home, away] = gameMatch;
    const homeLabel = home!.replace(/_/g, " ").trim();
    const awayLabel = away!.replace(/_/g, " ").trim();
    hints.sessionDate = `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
    hints.sessionType = "jogo";
    hints.sessionLabel = `${homeLabel} x ${awayLabel}`;
    hints.homeTeam = homeLabel;
    hints.awayTeam = awayLabel;
    hints.opponentName = awayLabel;
    return hints;
  }

  const datedTrain = /^(\d{4})_(\d{1,2})_(\d{1,2})\s+(.+)$/i.exec(base);
  if (datedTrain) {
    const [, y, m, d, label] = datedTrain;
    hints.sessionDate = `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
    hints.sessionType = "treino";
    hints.sessionLabel = label!.trim();
    hints.trainingType = label!.trim();
    return hints;
  }

  return hints;
}

function extractSummarySessionHints(workbook: XLSX.WorkBook): GpsImportSessionHints {
  const summaryName = findSheet(workbook, "summary");
  if (!summaryName) return {};
  const rows = sheetRows(workbook, summaryName);
  if (rows.length < 2) return {};
  const headers = (rows[0] ?? []).map((c) => String(c ?? "").trim());
  const dataRow = rows.find((row, idx) => {
    if (idx === 0) return false;
    const label = String(row[0] ?? "").trim();
    return label && !isSkippablePlayerLabel(label);
  });
  if (!dataRow) return {};

  const record: Record<string, string> = {};
  headers.forEach((h, i) => {
    record[normalizeGpsKey(h)] = String(dataRow[i] ?? "").trim();
  });

  return {
    sessionDate: parseHudDateToIso(record.date),
    trainingType: record.typesession || record.session || undefined,
    sessionLabel: record.session || record.typesession || undefined,
  };
}

function mergeSessionHints(
  ...parts: Array<GpsImportSessionHints | undefined>
): GpsImportSessionHints {
  const merged: GpsImportSessionHints = {};
  for (const part of parts) {
    if (!part) continue;
    Object.assign(merged, { ...merged, ...part });
    if (part.sessionDate) merged.sessionDate = part.sessionDate;
    if (part.sessionType) merged.sessionType = part.sessionType;
    if (part.sessionLabel) merged.sessionLabel = part.sessionLabel;
    if (part.trainingType) merged.trainingType = part.trainingType;
    if (part.opponentName) merged.opponentName = part.opponentName;
    if (part.homeTeam) merged.homeTeam = part.homeTeam;
    if (part.awayTeam) merged.awayTeam = part.awayTeam;
    if (part.sourceFileName) merged.sourceFileName = part.sourceFileName;
  }
  return merged;
}

function parseMetricSheet(
  rows: string[][],
  sheetKey: (typeof HUD_METRIC_SHEETS)[number],
  sessionType: "treino" | "jogo" | undefined,
): Map<string, WorkbookPlayerMetrics> {
  const out = new Map<string, WorkbookPlayerMetrics>();
  if (rows.length < 2) return out;

  const headers = (rows[0] ?? []).map((c) => String(c ?? "").trim());
  const fallbacks = SHEET_COLUMN_FALLBACK[sheetKey];

  const col = {
    player: findColumnIndex(headers, [...PLAYER_NAME_KEYS], "A"),
    repetition: findColumnIndex(headers, ["repetition"], "B"),
    trainingMinutes: findColumnIndex(headers, POSITIONING_DURATION_HEADERS, fallbacks.trainingMinutes),
    maxDistanceM: findColumnIndex(headers, DISTANCE_M_HEADERS, fallbacks.maxDistanceM, (h) =>
      headerMatchesAny(h, DISTANCE_M_HEADERS),
    ),
    lowIntensityDistanceM: findColumnIndex(
      headers,
      LOW_INTENSITY_M_HEADERS,
      fallbacks.lowIntensityDistanceM,
      (h) => normalizeGpsKey(h).includes("6001200") && normalizeGpsKey(h).includes("m") && !normalizeGpsKey(h).includes("cnt"),
    ),
    highIntensityDistanceM: findColumnIndex(
      headers,
      HIGH_INTENSITY_M_HEADERS,
      fallbacks.highIntensityDistanceM,
      (h) => normalizeGpsKey(h).includes("12001800") && normalizeGpsKey(h).includes("m") && !normalizeGpsKey(h).includes("cnt"),
    ),
    accelerations: findColumnIndex(headers, ACCELERATIONS_HEADERS, fallbacks.accelerations),
    decelerations: findColumnIndex(headers, DECELERATIONS_HEADERS, fallbacks.decelerations),
    sprintCount: findColumnIndex(headers, SPRINT_ABS_CNT_HEADERS, fallbacks.sprintCount),
    maxSpeedKmh: findColumnIndex(headers, MAX_SPEED_HEADERS, fallbacks.maxSpeedKmh),
  };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const playerLabel = String(row[col.player] ?? "").trim();
    if (isSkippablePlayerLabel(playerLabel)) continue;

    const repetition = String(col.repetition >= 0 ? row[col.repetition] ?? "" : "").trim();
    // Jogo HUD: totais da partida ficam na linha sem Repetition; blocos 1º/2º tempo usam Repetition=1.
    if (sessionType === "jogo" && repetition) continue;

    const key = normalizePlayerSearchName(playerLabel);
    // Primeira linha válida por atleta/aba (evita sobrescrever com blocos Drills/ períodos).
    if (out.has(key)) continue;

    const existing: WorkbookPlayerMetrics = { workbookLabel: playerLabel };

    const durationRaw = col.trainingMinutes >= 0 ? row[col.trainingMinutes] : undefined;
    const durationMin = parseDurationMinutes(String(durationRaw ?? ""));
    if (durationMin != null) {
      if (sessionType === "jogo") existing.gameMinutes = durationMin;
      else existing.trainingMinutes = durationMin;
    }

    const distance = parseNum(String(col.maxDistanceM >= 0 ? row[col.maxDistanceM] ?? "" : ""));
    if (distance != null) existing.maxDistanceM = distance;

    const low = parseNum(String(col.lowIntensityDistanceM >= 0 ? row[col.lowIntensityDistanceM] ?? "" : ""));
    if (low != null) existing.lowIntensityDistanceM = low;

    const high = parseNum(String(col.highIntensityDistanceM >= 0 ? row[col.highIntensityDistanceM] ?? "" : ""));
    if (high != null) existing.highIntensityDistanceM = high;

    const acc = parseNum(String(col.accelerations >= 0 ? row[col.accelerations] ?? "" : ""));
    if (acc != null) existing.accelerations = Math.round(acc);

    const dec = parseNum(String(col.decelerations >= 0 ? row[col.decelerations] ?? "" : ""));
    if (dec != null) existing.decelerations = Math.round(dec);

    const sprints = parseNum(String(col.sprintCount >= 0 ? row[col.sprintCount] ?? "" : ""));
    if (sprints != null) existing.sprintCount = Math.round(sprints);

    const maxSpeed = parseNum(String(col.maxSpeedKmh >= 0 ? row[col.maxSpeedKmh] ?? "" : ""));
    if (maxSpeed != null) existing.maxSpeedKmh = maxSpeed;

    out.set(key, existing);
  }

  return out;
}

function mergeWorkbookMetrics(
  workbook: XLSX.WorkBook,
  sessionType: "treino" | "jogo" | undefined,
): Map<string, WorkbookPlayerMetrics> {
  const merged = new Map<string, WorkbookPlayerMetrics>();

  for (const sheetKey of HUD_METRIC_SHEETS) {
    const sheetName = findSheet(workbook, sheetKey);
    if (!sheetName) continue;
    const sheetMap = parseMetricSheet(sheetRows(workbook, sheetName), sheetKey, sessionType);
    for (const [key, metrics] of sheetMap) {
      const prev = merged.get(key) ?? {};
      merged.set(key, { ...prev, ...metrics, workbookLabel: metrics.workbookLabel ?? prev.workbookLabel });
    }
  }

  return merged;
}

function metricsToPatch(
  metrics: WorkbookPlayerMetrics,
  sessionType: "treino" | "jogo" | undefined,
): GpsImportRowPatch {
  const patch: GpsImportRowPatch = {
    present: true,
    gpsImportLabel: String(metrics.workbookLabel ?? ""),
  };

  if (metrics.maxDistanceM != null) patch.maxDistanceM = metrics.maxDistanceM as number;
  if (metrics.lowIntensityDistanceM != null) patch.lowIntensityDistanceM = metrics.lowIntensityDistanceM as number;
  if (metrics.highIntensityDistanceM != null) patch.highIntensityDistanceM = metrics.highIntensityDistanceM as number;
  if (metrics.maxSpeedKmh != null) patch.maxSpeedKmh = metrics.maxSpeedKmh as number;
  if (metrics.sprintCount != null) patch.sprintCount = metrics.sprintCount as number;

  if (sessionType === "jogo") {
    if (metrics.gameMinutes != null) patch.gameMinutes = metrics.gameMinutes as number;
  } else if (metrics.trainingMinutes != null) {
    patch.trainingMinutes = metrics.trainingMinutes as number;
  } else if (metrics.gameMinutes != null) {
    patch.gameMinutes = metrics.gameMinutes as number;
  }

  const gpsData: Record<string, unknown> = { hudImport: true };
  if (metrics.accelerations != null) {
    patch.accelerations = metrics.accelerations as number;
    gpsData.accelerations = metrics.accelerations;
  }
  if (metrics.decelerations != null) {
    patch.decelerations = metrics.decelerations as number;
    gpsData.decelerations = metrics.decelerations;
  }
  if (Object.keys(gpsData).length > 1) patch.gpsData = gpsData;

  return patch;
}

function hasGpsMetrics(patch: GpsImportRowPatch): boolean {
  return (
    patch.maxDistanceM != null ||
    patch.maxSpeedKmh != null ||
    patch.sprintCount != null ||
    patch.highIntensityDistanceM != null ||
    patch.lowIntensityDistanceM != null ||
    patch.accelerations != null ||
    patch.decelerations != null ||
    patch.rpe != null ||
    patch.trainingMinutes != null ||
    patch.gameMinutes != null
  );
}

function rowToRecord(headers: string[], cols: string[]): Record<string, string> {
  const row: Record<string, string> = {};
  headers.forEach((h, idx) => {
    row[h] = cols[idx] ?? "";
  });
  return row;
}

function applyFieldAliases(row: Record<string, string>, patch: GpsImportRowPatch): void {
  for (const [header, field] of Object.entries(GPS_FIELD_ALIASES)) {
    if (field === "playerName") continue;
    const val = row[header];
    if (val == null || !String(val).trim()) continue;

    if (field === "rpe" || field === "sprintCount" || field === "gameMinutes" || field === "accelerations" || field === "decelerations") {
      const n = parseNum(val);
      if (n != null) patch[field] = Math.round(n);
      continue;
    }

    if (field === "trainingMinutes") {
      const minutes = parseDurationMinutes(val);
      if (minutes != null) patch[field] = minutes;
      continue;
    }

    const n = parseNum(val);
    if (n != null) {
      if (field === "lowIntensityDistanceM" || field === "highIntensityDistanceM") {
        patch[field] = n;
      } else if (field === "maxDistanceM" || field === "maxSpeedKmh") {
        patch[field] = n;
      }
    }
  }

  if (patch.accelerations != null || patch.decelerations != null) {
    patch.gpsData = {
      ...(patch.gpsData ?? {}),
      hudImport: true,
      ...(patch.accelerations != null ? { accelerations: patch.accelerations } : {}),
      ...(patch.decelerations != null ? { decelerations: patch.decelerations } : {}),
    };
  }
}

function extractPlayerLabel(row: Record<string, string>, cols: string[]): string {
  for (const key of PLAYER_NAME_KEYS) {
    const val = row[key]?.trim();
    if (val) return val;
  }
  return cols[0]?.trim() ?? "";
}

function extractSessionHintsFromSummaryRow(row: Record<string, string>): GpsImportSessionHints {
  return {
    sessionDate: parseHudDateToIso(row.date),
    trainingType: row.typesession?.trim() || row.session?.trim() || undefined,
    sessionLabel: row.session?.trim() || row.typesession?.trim() || undefined,
  };
}

export function parseGpsImportRows(
  rows: string[][],
  roster: GpsImportRosterPlayer[],
): GpsImportResult {
  const patches = new Map<string, GpsImportRowPatch>();
  const unmatched: string[] = [];
  const ambiguous: GpsImportResult["ambiguous"] = [];
  const athleteMatches: GpsAthleteMatchRow[] = [];
  let matched = 0;
  let withGpsData = 0;
  let sessionHints: GpsImportSessionHints = {};

  const nonEmpty = rows.filter((row) => row.some((cell) => String(cell ?? "").trim()));
  if (nonEmpty.length < 2) {
    return {
      matched: 0,
      withGpsData: 0,
      unmatched,
      ambiguous,
      athleteMatches,
      patches,
      pendingPatches: new Map(),
      sessionHints,
      workbookAthleteCount: 0,
    };
  }

  const headers = nonEmpty[0]!.map((cell) => normalizeGpsKey(String(cell ?? "")));

  for (let i = 1; i < nonEmpty.length; i++) {
    const cols = nonEmpty[i]!.map((cell) => String(cell ?? "").trim());
    if (cols.every((c) => !c)) continue;

    const row = rowToRecord(headers, cols);
    if (i === 1) sessionHints = extractSessionHintsFromSummaryRow(row);

    const playerLabel = extractPlayerLabel(row, cols);
    if (isSkippablePlayerLabel(playerLabel)) continue;

    const match = resolveAthleteMatch(playerLabel, roster);
    if (match.status === "unmatched") {
      unmatched.push(playerLabel);
      athleteMatches.push({ workbookLabel: playerLabel, status: "unmatched" });
      continue;
    }
    if (match.status === "ambiguous") {
      const candidates = match.candidates.map((p) => ({ id: p.id, name: p.name }));
      ambiguous.push({ label: playerLabel, candidates });
      athleteMatches.push({ workbookLabel: playerLabel, status: "ambiguous", candidates });
      continue;
    }

    const patch: GpsImportRowPatch = {
      present: true,
      gpsImportLabel: playerLabel || match.player.name,
    };
    applyFieldAliases(row, patch);
    patches.set(match.player.id, { ...patches.get(match.player.id), ...patch });
    matched += 1;
    athleteMatches.push({
      workbookLabel: playerLabel,
      status: "matched",
      playerId: match.player.id,
      playerName: match.player.name,
    });
    if (hasGpsMetrics(patch)) withGpsData += 1;
  }

  return {
    matched,
    withGpsData,
    unmatched,
    ambiguous,
    athleteMatches,
    patches,
    pendingPatches: new Map(),
    sessionHints,
    workbookAthleteCount: athleteMatches.length,
  };
}

export function parseGpsImportText(
  text: string,
  roster: GpsImportRosterPlayer[],
): GpsImportResult {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const rows = lines.map(parseCsvLine);
  return parseGpsImportRows(rows, roster);
}

export function parseHudWorkbookFromBuffer(
  buffer: ArrayBuffer,
  roster: GpsImportRosterPlayer[],
  fileName?: string,
): GpsImportResult {
  const workbook = XLSX.read(buffer, { type: "array", raw: false, cellDates: false });
  const detectedSheets = workbook.SheetNames;
  const filenameHints = fileName ? parseFilenameSessionHints(fileName) : {};
  const summaryHints = extractSummarySessionHints(workbook);
  const sessionHints = mergeSessionHints(summaryHints, filenameHints);
  sessionHints.detectedSheets = detectedSheets;

  const hasMetricSheets = HUD_METRIC_SHEETS.some((key) => findSheet(workbook, key));
  if (hasMetricSheets) {
    const workbookMetrics = mergeWorkbookMetrics(workbook, sessionHints.sessionType);
    const patches = new Map<string, GpsImportRowPatch>();
    const pendingPatches = new Map<string, GpsImportRowPatch>();
    const unmatched: string[] = [];
    const ambiguous: GpsImportResult["ambiguous"] = [];
    const athleteMatches: GpsAthleteMatchRow[] = [];
    let matched = 0;
    let withGpsData = 0;

    for (const metrics of workbookMetrics.values()) {
      const label = String(metrics.workbookLabel ?? "").trim();
      if (!label) continue;

      const patch = metricsToPatch(metrics, sessionHints.sessionType);
      patch.gpsImportLabel = label;
      const match = resolveAthleteMatch(label, roster);
      if (match.status === "unmatched") {
        unmatched.push(label);
        pendingPatches.set(label, patch);
        athleteMatches.push({ workbookLabel: label, status: "unmatched" });
        continue;
      }
      if (match.status === "ambiguous") {
        const candidates = match.candidates.map((p) => ({ id: p.id, name: p.name }));
        ambiguous.push({ label, candidates });
        pendingPatches.set(label, patch);
        athleteMatches.push({ workbookLabel: label, status: "ambiguous", candidates });
        continue;
      }

      const prev = patches.get(match.player.id);
      patches.set(match.player.id, {
        ...prev,
        ...patch,
        gpsData: { ...(prev?.gpsData ?? {}), ...(patch.gpsData ?? {}) },
      });
      matched += 1;
      athleteMatches.push({
        workbookLabel: label,
        status: "matched",
        playerId: match.player.id,
        playerName: match.player.name,
      });
      if (hasGpsMetrics(patch)) withGpsData += 1;
    }

    return {
      matched,
      withGpsData,
      unmatched,
      ambiguous,
      athleteMatches,
      patches,
      pendingPatches,
      sessionHints,
      workbookAthleteCount: workbookMetrics.size,
    };
  }

  const preferredSheet =
    findSheet(workbook, "summary") ??
    workbook.SheetNames.find((name) => {
      const preview = sheetRows(workbook, name);
      const headerRow = preview[0] ?? [];
      return headerRow.some((cell) => normalizeGpsKey(String(cell ?? "")) === "player");
    }) ??
    workbook.SheetNames[0];

  if (!preferredSheet) {
    return {
      matched: 0,
      withGpsData: 0,
      unmatched: [],
      ambiguous: [],
      athleteMatches: [],
      patches: new Map(),
      pendingPatches: new Map(),
      sessionHints,
      workbookAthleteCount: 0,
    };
  }

  const legacy = parseGpsImportRows(sheetRows(workbook, preferredSheet), roster);
  return {
    ...legacy,
    sessionHints: { ...mergeSessionHints(sessionHints, legacy.sessionHints), detectedSheets },
    pendingPatches: legacy.pendingPatches ?? new Map(),
  };
}

export async function parseGpsXlsxFile(
  file: File,
  roster: GpsImportRosterPlayer[],
): Promise<GpsImportResult> {
  const buffer = await file.arrayBuffer();
  return parseHudWorkbookFromBuffer(buffer, roster, file.name);
}

export function applyAmbiguousResolution(
  result: GpsImportResult,
  resolutions: Record<string, string>,
): GpsImportResult {
  const patches = new Map(result.patches);
  const athleteMatches = [...result.athleteMatches];
  const ambiguous = [...result.ambiguous];
  let matched = result.matched;
  let withGpsData = result.withGpsData;

  for (const item of result.ambiguous) {
    const playerId = resolutions[item.label];
    if (!playerId) continue;

    const sourcePatch = result.pendingPatches.get(item.label);
    if (!sourcePatch) continue;

    const idx = ambiguous.findIndex((a) => a.label === item.label);
    if (idx >= 0) ambiguous.splice(idx, 1);

    const matchIdx = athleteMatches.findIndex((m) => m.workbookLabel === item.label);
    if (matchIdx >= 0) {
      athleteMatches[matchIdx] = {
        workbookLabel: item.label,
        status: "matched",
        playerId,
        playerName: item.candidates.find((c) => c.id === playerId)?.name,
      };
      matched += 1;
    }

    const prev = patches.get(playerId);
    const merged = {
      ...prev,
      ...sourcePatch,
      gpsData: { ...(prev?.gpsData ?? {}), ...(sourcePatch.gpsData ?? {}) },
    };
    patches.set(playerId, merged);
    if (!prev && hasGpsMetrics(sourcePatch)) withGpsData += 1;
  }

  return {
    ...result,
    matched,
    withGpsData,
    ambiguous,
    athleteMatches,
    patches,
  };
}
