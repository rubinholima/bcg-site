import * as XLSX from "xlsx";

export type GpsImportRosterPlayer = {
  id: string;
  name: string;
  jerseyNumber: number | null;
};

export type GpsImportFieldKey =
  | "playerName"
  | "maxDistanceM"
  | "maxSpeedKmh"
  | "sprintCount"
  | "highIntensityDistanceM"
  | "lowIntensityDistanceM"
  | "sprintDistanceM"
  | "rpe"
  | "trainingMinutes"
  | "gameMinutes";

export type GpsImportRowPatch = Partial<Record<GpsImportFieldKey, number | string | null>> & {
  present?: boolean;
  gpsImportLabel?: string;
};

export type GpsImportSessionHints = {
  sessionDate?: string;
  trainingType?: string;
};

export type GpsImportResult = {
  matched: number;
  withGpsData: number;
  unmatched: string[];
  patches: Map<string, GpsImportRowPatch>;
  sessionHints: GpsImportSessionHints;
};

/** Colunas HUD (Summary) e aliases genéricos — chaves já normalizadas. */
export const GPS_FIELD_ALIASES: Record<string, GpsImportFieldKey> = {
  nome: "playerName",
  atleta: "playerName",
  player: "playerName",
  jogador: "playerName",
  maxdistance: "maxDistanceM",
  distanciamax: "maxDistanceM",
  distancia: "maxDistanceM",
  distancem: "maxDistanceM",
  distance: "maxDistanceM",
  totaldistance: "maxDistanceM",
  maxspeed: "maxSpeedKmh",
  maxspeedkmh: "maxSpeedKmh",
  velocidademax: "maxSpeedKmh",
  velocidade: "maxSpeedKmh",
  avgspeedkmh: "maxSpeedKmh",
  sprintcount: "sprintCount",
  sprints: "sprintCount",
  sprintabscnt: "sprintCount",
  sprintrelcnt: "sprintCount",
  sprintmaxcnt: "sprintCount",
  highintensitydistance: "highIntensityDistanceM",
  distanciaalta: "highIntensityDistanceM",
  distanciaaltainten: "highIntensityDistanceM",
  hsrabsm: "highIntensityDistanceM",
  hsrrelm: "highIntensityDistanceM",
  hibdm: "highIntensityDistanceM",
  explosivedistm: "highIntensityDistanceM",
  hmldm: "highIntensityDistanceM",
  hmldmv2: "highIntensityDistanceM",
  lowintensitydistance: "lowIntensityDistanceM",
  distanciabaixa: "lowIntensityDistanceM",
  sprintdistance: "sprintDistanceM",
  distanciasprint: "sprintDistanceM",
  sprintabsm: "sprintDistanceM",
  sprintrelm: "sprintDistanceM",
  sprintmaxm: "sprintDistanceM",
  rpe: "rpe",
  pse: "rpe",
  trainingminutes: "trainingMinutes",
  minutos: "trainingMinutes",
  drillsduration: "trainingMinutes",
  drillduration: "trainingMinutes",
  positioningduration: "trainingMinutes",
  activetimes: "trainingMinutes",
  gameminutes: "gameMinutes",
};

const PLAYER_NAME_KEYS = ["player", "nome", "atleta", "jogador"] as const;
const NICKNAME_KEYS = ["nickname", "apelido", "nick"] as const;

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

export function matchPlayerName(
  name: string,
  roster: GpsImportRosterPlayer[],
): GpsImportRosterPlayer | null {
  const norm = normalizePlayerSearchName(name);
  if (!norm || norm.length < 2) return null;

  const exact = roster.find((p) => normalizePlayerSearchName(p.name) === norm);
  if (exact) return exact;

  const partialMatches = roster.filter((p) => {
    const pNorm = normalizePlayerSearchName(p.name);
    return norm.includes(pNorm) || pNorm.includes(norm);
  });
  if (partialMatches.length === 1) return partialMatches[0]!;

  const tokens = norm.split(" ").filter((t) => t.length >= 2);
  const lastName = tokens[tokens.length - 1] ?? "";
  if (lastName.length >= 3) {
    const byLast = roster.filter((p) => {
      const pNorm = normalizePlayerSearchName(p.name);
      return pNorm.endsWith(` ${lastName}`) || pNorm.split(" ").pop() === lastName;
    });
    if (byLast.length === 1) return byLast[0]!;
  }

  if (tokens.length === 1 && tokens[0]!.length >= 3) {
    const byToken = roster.filter((p) => normalizePlayerSearchName(p.name).includes(tokens[0]!));
    if (byToken.length === 1) return byToken[0]!;
  }

  return null;
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

function rowToRecord(headers: string[], cols: string[]): Record<string, string> {
  const row: Record<string, string> = {};
  headers.forEach((h, idx) => {
    row[h] = cols[idx] ?? "";
  });
  return row;
}

function extractPlayerLabel(row: Record<string, string>, cols: string[]): string {
  for (const key of PLAYER_NAME_KEYS) {
    const val = row[key]?.trim();
    if (val) return val;
  }
  return cols[0]?.trim() ?? "";
}

function extractNickname(row: Record<string, string>): string {
  for (const key of NICKNAME_KEYS) {
    const val = row[key]?.trim();
    if (val) return val;
  }
  return "";
}

function applyFieldAliases(
  row: Record<string, string>,
  patch: GpsImportRowPatch,
): void {
  for (const [header, field] of Object.entries(GPS_FIELD_ALIASES)) {
    if (field === "playerName") continue;
    const val = row[header];
    if (val == null || !String(val).trim()) continue;

    if (field === "rpe" || field === "sprintCount" || field === "gameMinutes") {
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
    if (n != null) patch[field] = n;
  }
}

function extractSessionHints(row: Record<string, string>): GpsImportSessionHints {
  const sessionDate = parseHudDateToIso(row.date);
  const trainingType = row.typesession?.trim() || row.session?.trim() || undefined;
  return { sessionDate, trainingType };
}

function hasGpsMetrics(patch: GpsImportRowPatch): boolean {
  return (
    patch.maxDistanceM != null ||
    patch.maxSpeedKmh != null ||
    patch.sprintCount != null ||
    patch.highIntensityDistanceM != null ||
    patch.lowIntensityDistanceM != null ||
    patch.sprintDistanceM != null ||
    patch.rpe != null ||
    patch.trainingMinutes != null ||
    patch.gameMinutes != null
  );
}

export function parseGpsImportRows(
  rows: string[][],
  roster: GpsImportRosterPlayer[],
): GpsImportResult {
  const patches = new Map<string, GpsImportRowPatch>();
  const unmatched: string[] = [];
  let matched = 0;
  let withGpsData = 0;
  let sessionHints: GpsImportSessionHints = {};

  const nonEmpty = rows.filter((row) => row.some((cell) => String(cell ?? "").trim()));
  if (nonEmpty.length < 2) {
    return { matched: 0, withGpsData: 0, unmatched, patches, sessionHints };
  }

  const headers = nonEmpty[0]!.map((cell) => normalizeGpsKey(String(cell ?? "")));

  for (let i = 1; i < nonEmpty.length; i++) {
    const cols = nonEmpty[i]!.map((cell) => String(cell ?? "").trim());
    if (cols.every((c) => !c)) continue;

    const row = rowToRecord(headers, cols);
    if (i === 1) sessionHints = extractSessionHints(row);

    const playerLabel = extractPlayerLabel(row, cols);
    const nickname = extractNickname(row);
    let player =
      matchPlayerName(playerLabel, roster) ??
      (nickname ? matchPlayerName(nickname, roster) : null);

    if (!player) {
      if (playerLabel) unmatched.push(playerLabel);
      continue;
    }

    const patch: GpsImportRowPatch = {
      present: true,
      gpsImportLabel: playerLabel || nickname || player.name,
    };
    applyFieldAliases(row, patch);
    patches.set(player.id, { ...patches.get(player.id), ...patch });
    matched += 1;
    if (hasGpsMetrics(patch)) withGpsData += 1;
  }

  return { matched, withGpsData, unmatched, patches, sessionHints };
}

export function parseGpsImportText(
  text: string,
  roster: GpsImportRosterPlayer[],
): GpsImportResult {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const rows = lines.map(parseCsvLine);
  return parseGpsImportRows(rows, roster);
}

export async function parseGpsXlsxFile(
  file: File,
  roster: GpsImportRosterPlayer[],
): Promise<GpsImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const preferredSheet =
    workbook.SheetNames.find((name) => normalizeGpsKey(name) === "summary") ??
    workbook.SheetNames.find((name) => {
      const sheet = workbook.Sheets[name];
      if (!sheet) return false;
      const preview = XLSX.utils.sheet_to_json<string[]>(sheet, {
        header: 1,
        range: 0,
        defval: "",
      }) as string[][];
      const headerRow = preview[0] ?? [];
      return headerRow.some((cell) => normalizeGpsKey(String(cell ?? "")) === "player");
    }) ??
    workbook.SheetNames[0];

  if (!preferredSheet) {
    return { matched: 0, withGpsData: 0, unmatched: [], patches: new Map(), sessionHints: {} };
  }

  const sheet = workbook.Sheets[preferredSheet]!;
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as string[][];

  return parseGpsImportRows(rows, roster);
}
