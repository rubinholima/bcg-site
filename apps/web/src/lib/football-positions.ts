/** Posições canônicas BCG — manter alinhado com apps/api/src/common/football-positions.util.ts */

export const FOOTBALL_POSITIONS = [
  { value: "GOLEIRO", label: "Goleiro" },
  { value: "ZAGUEIRO", label: "Zagueiro" },
  { value: "LATERAL ESQUERDO", label: "Lateral Esquerdo" },
  { value: "LATERAL DIREITO", label: "Lateral Direito" },
  { value: "VOLANTE", label: "Volante" },
  { value: "MEIO-CAMPO", label: "Meio-campo" },
  { value: "EXTREMO", label: "Extremo" },
  { value: "CENTROAVANTE", label: "Centroavante" },
] as const;

export type FootballPositionCode = (typeof FOOTBALL_POSITIONS)[number]["value"];

const LABEL_TO_CODE: Record<string, FootballPositionCode> = {
  goleiro: "GOLEIRO",
  gol: "GOLEIRO",
  zagueiro: "ZAGUEIRO",
  "zagueiro central": "ZAGUEIRO",
  zag: "ZAGUEIRO",
  "lateral esquerdo": "LATERAL ESQUERDO",
  "lateral esq": "LATERAL ESQUERDO",
  "l.e": "LATERAL ESQUERDO",
  lat: "LATERAL ESQUERDO",
  "lateral direito": "LATERAL DIREITO",
  "lateral dir": "LATERAL DIREITO",
  "l.d": "LATERAL DIREITO",
  "ala esquerdo": "LATERAL ESQUERDO",
  "ala esq": "LATERAL ESQUERDO",
  "ala direito": "LATERAL DIREITO",
  "ala dir": "LATERAL DIREITO",
  volante: "VOLANTE",
  vol: "VOLANTE",
  "meio-campo": "MEIO-CAMPO",
  "meio campo": "MEIO-CAMPO",
  "meio-campista": "MEIO-CAMPO",
  meia: "MEIO-CAMPO",
  mei: "MEIO-CAMPO",
  mec: "MEIO-CAMPO",
  "meia-atacante": "MEIO-CAMPO",
  "meia atacante": "MEIO-CAMPO",
  "meia esquerda": "MEIO-CAMPO",
  "meia direita": "MEIO-CAMPO",
  extremo: "EXTREMO",
  ext: "EXTREMO",
  "ponta esquerda": "EXTREMO",
  "ponta direita": "EXTREMO",
  ponta: "EXTREMO",
  pon: "EXTREMO",
  centroavante: "CENTROAVANTE",
  atacante: "CENTROAVANTE",
  ata: "CENTROAVANTE",
  cf: "CENTROAVANTE",
  st: "CENTROAVANTE",
};

/** Códigos legados em inglês → canônico em português. */
const LEGACY_CODE_MAP: Record<string, FootballPositionCode> = {
  GK: "GOLEIRO",
  CB: "ZAGUEIRO",
  LB: "LATERAL ESQUERDO",
  RB: "LATERAL DIREITO",
  CDM: "VOLANTE",
  CM: "MEIO-CAMPO",
  EXT: "EXTREMO",
  ST: "CENTROAVANTE",
  LWB: "LATERAL ESQUERDO",
  RWB: "LATERAL DIREITO",
  CAM: "MEIO-CAMPO",
  LM: "MEIO-CAMPO",
  RM: "MEIO-CAMPO",
  LW: "EXTREMO",
  RW: "EXTREMO",
  CF: "CENTROAVANTE",
};

const CANONICAL = new Set(FOOTBALL_POSITIONS.map((p) => p.value));

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

function toCanonicalUpper(raw: string): string {
  return raw.trim().toLocaleUpperCase("pt-BR");
}

/** Converte código ou rótulo legado para valor canônico em português. */
export function normalizeFootballPositionCode(
  value: string | null | undefined,
): FootballPositionCode | null {
  if (value == null || !value.trim()) return null;
  const raw = value.trim();
  const upper = toCanonicalUpper(raw);

  if (CANONICAL.has(upper as FootballPositionCode)) {
    return upper as FootballPositionCode;
  }
  if (LEGACY_CODE_MAP[upper]) return LEGACY_CODE_MAP[upper];

  const byLabel = LABEL_TO_CODE[normalizeKey(raw)];
  return byLabel ?? null;
}

/** Retorna o nome legível da posição; aceita códigos legados e rótulos em PT. */
export function getPositionLabel(value: string | undefined | null): string {
  if (value == null || value === "") return "";
  const code = normalizeFootballPositionCode(value);
  if (code) {
    const pos = FOOTBALL_POSITIONS.find((p) => p.value === code);
    return pos ? pos.label : value;
  }
  return value;
}

/** Coordenadas padrão no campo (aba Mapa / Posição). */
export const FIELD_POSITION_DEFAULTS: Record<FootballPositionCode, { x: number; y: number }> = {
  GOLEIRO: { x: 50, y: 90 },
  ZAGUEIRO: { x: 50, y: 72 },
  "LATERAL ESQUERDO": { x: 18, y: 68 },
  "LATERAL DIREITO": { x: 82, y: 68 },
  VOLANTE: { x: 50, y: 55 },
  "MEIO-CAMPO": { x: 50, y: 42 },
  EXTREMO: { x: 50, y: 25 },
  CENTROAVANTE: { x: 50, y: 12 },
};

export const LEGACY_FIELD_ON_MIGRATE: Partial<
  Record<string, { code: FootballPositionCode; x: number; y: number }>
> = {
  GK: { code: "GOLEIRO", x: 50, y: 90 },
  CB: { code: "ZAGUEIRO", x: 50, y: 72 },
  LB: { code: "LATERAL ESQUERDO", x: 18, y: 68 },
  RB: { code: "LATERAL DIREITO", x: 82, y: 68 },
  CDM: { code: "VOLANTE", x: 50, y: 55 },
  CM: { code: "MEIO-CAMPO", x: 50, y: 42 },
  EXT: { code: "EXTREMO", x: 50, y: 25 },
  ST: { code: "CENTROAVANTE", x: 50, y: 12 },
  LWB: { code: "LATERAL ESQUERDO", x: 18, y: 68 },
  RWB: { code: "LATERAL DIREITO", x: 82, y: 68 },
  CAM: { code: "MEIO-CAMPO", x: 50, y: 38 },
  LM: { code: "MEIO-CAMPO", x: 38, y: 42 },
  RM: { code: "MEIO-CAMPO", x: 62, y: 42 },
  LW: { code: "EXTREMO", x: 18, y: 25 },
  RW: { code: "EXTREMO", x: 82, y: 25 },
  CF: { code: "CENTROAVANTE", x: 50, y: 12 },
};
