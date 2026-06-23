/**
 * Posições canônicas BCG (cadastro, site, importações).
 * Valores gravados em Player.position em português (maiúsculas via cadastroUpper).
 */

export const FOOTBALL_POSITION_CODES = [
  'GOLEIRO',
  'ZAGUEIRO',
  'LATERAL ESQUERDO',
  'LATERAL DIREITO',
  'VOLANTE',
  'MEIO-CAMPO',
  'EXTREMO',
  'CENTROAVANTE',
] as const;

export type FootballPositionCode = (typeof FOOTBALL_POSITION_CODES)[number];

export const FOOTBALL_POSITIONS: ReadonlyArray<{ value: FootballPositionCode; label: string }> = [
  { value: 'GOLEIRO', label: 'Goleiro' },
  { value: 'ZAGUEIRO', label: 'Zagueiro' },
  { value: 'LATERAL ESQUERDO', label: 'Lateral Esquerdo' },
  { value: 'LATERAL DIREITO', label: 'Lateral Direito' },
  { value: 'VOLANTE', label: 'Volante' },
  { value: 'MEIO-CAMPO', label: 'Meio-campo' },
  { value: 'EXTREMO', label: 'Extremo' },
  { value: 'CENTROAVANTE', label: 'Centroavante' },
];

const LABEL_TO_CODE: Record<string, FootballPositionCode> = {
  goleiro: 'GOLEIRO',
  gol: 'GOLEIRO',
  zagueiro: 'ZAGUEIRO',
  'zagueiro central': 'ZAGUEIRO',
  zag: 'ZAGUEIRO',
  'lateral esquerdo': 'LATERAL ESQUERDO',
  'lateral esq': 'LATERAL ESQUERDO',
  'l.e': 'LATERAL ESQUERDO',
  lat: 'LATERAL ESQUERDO',
  'lateral direito': 'LATERAL DIREITO',
  'lateral dir': 'LATERAL DIREITO',
  'l.d': 'LATERAL DIREITO',
  'ala esquerdo': 'LATERAL ESQUERDO',
  'ala esq': 'LATERAL ESQUERDO',
  'ala direito': 'LATERAL DIREITO',
  'ala dir': 'LATERAL DIREITO',
  volante: 'VOLANTE',
  vol: 'VOLANTE',
  'meio-campo': 'MEIO-CAMPO',
  'meio campo': 'MEIO-CAMPO',
  'meio-campista': 'MEIO-CAMPO',
  meia: 'MEIO-CAMPO',
  mei: 'MEIO-CAMPO',
  mec: 'MEIO-CAMPO',
  'meia-atacante': 'MEIO-CAMPO',
  'meia atacante': 'MEIO-CAMPO',
  'meia esquerda': 'MEIO-CAMPO',
  'meia direita': 'MEIO-CAMPO',
  extremo: 'EXTREMO',
  ext: 'EXTREMO',
  'ponta esquerda': 'EXTREMO',
  'ponta direita': 'EXTREMO',
  ponta: 'EXTREMO',
  pon: 'EXTREMO',
  centroavante: 'CENTROAVANTE',
  atacante: 'CENTROAVANTE',
  ata: 'CENTROAVANTE',
  cf: 'CENTROAVANTE',
  st: 'CENTROAVANTE',
};

/** Códigos legados → canônico em português + coordenada sugerida no campo (0–100). */
export const LEGACY_POSITION_MIGRATION: Record<
  string,
  { code: FootballPositionCode; fieldPositionX: number; fieldPositionY: number }
> = {
  GK: { code: 'GOLEIRO', fieldPositionX: 50, fieldPositionY: 90 },
  CB: { code: 'ZAGUEIRO', fieldPositionX: 50, fieldPositionY: 72 },
  LB: { code: 'LATERAL ESQUERDO', fieldPositionX: 18, fieldPositionY: 68 },
  RB: { code: 'LATERAL DIREITO', fieldPositionX: 82, fieldPositionY: 68 },
  CDM: { code: 'VOLANTE', fieldPositionX: 50, fieldPositionY: 55 },
  CM: { code: 'MEIO-CAMPO', fieldPositionX: 50, fieldPositionY: 42 },
  EXT: { code: 'EXTREMO', fieldPositionX: 50, fieldPositionY: 25 },
  ST: { code: 'CENTROAVANTE', fieldPositionX: 50, fieldPositionY: 12 },
  LWB: { code: 'LATERAL ESQUERDO', fieldPositionX: 18, fieldPositionY: 68 },
  RWB: { code: 'LATERAL DIREITO', fieldPositionX: 82, fieldPositionY: 68 },
  CAM: { code: 'MEIO-CAMPO', fieldPositionX: 50, fieldPositionY: 38 },
  LM: { code: 'MEIO-CAMPO', fieldPositionX: 38, fieldPositionY: 42 },
  RM: { code: 'MEIO-CAMPO', fieldPositionX: 62, fieldPositionY: 42 },
  LW: { code: 'EXTREMO', fieldPositionX: 18, fieldPositionY: 25 },
  RW: { code: 'EXTREMO', fieldPositionX: 82, fieldPositionY: 25 },
  CF: { code: 'CENTROAVANTE', fieldPositionX: 50, fieldPositionY: 12 },
};

export const FIELD_POSITION_DEFAULTS: Record<FootballPositionCode, { x: number; y: number }> = {
  GOLEIRO: { x: 50, y: 90 },
  ZAGUEIRO: { x: 50, y: 72 },
  'LATERAL ESQUERDO': { x: 18, y: 68 },
  'LATERAL DIREITO': { x: 82, y: 68 },
  VOLANTE: { x: 50, y: 55 },
  'MEIO-CAMPO': { x: 50, y: 42 },
  EXTREMO: { x: 50, y: 25 },
  CENTROAVANTE: { x: 50, y: 12 },
};

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
}

function toCanonicalUpper(raw: string): string {
  return raw.trim().toLocaleUpperCase('pt-BR');
}

/** Converte código ou rótulo (PT/EN legado) para valor canônico em português. */
export function normalizeFootballPositionCode(
  value: string | null | undefined,
): FootballPositionCode | null {
  if (value == null || !value.trim()) return null;
  const raw = value.trim();
  const upper = toCanonicalUpper(raw);

  if (FOOTBALL_POSITION_CODES.includes(upper as FootballPositionCode)) {
    return upper as FootballPositionCode;
  }

  const legacy = LEGACY_POSITION_MIGRATION[upper];
  if (legacy) return legacy.code;

  const byLabel = LABEL_TO_CODE[normalizeKey(raw)];
  if (byLabel) return byLabel;

  return null;
}

export function getFootballPositionLabel(value: string | null | undefined): string {
  if (value == null || !value.trim()) return '';
  const code = normalizeFootballPositionCode(value);
  if (code) {
    return FOOTBALL_POSITIONS.find((p) => p.value === code)?.label ?? value;
  }
  return value;
}

export function getFieldPositionForMigration(
  currentPosition: string | null | undefined,
  currentX: number | null | undefined,
  currentY: number | null | undefined,
): { code: FootballPositionCode; fieldPositionX: number; fieldPositionY: number } | null {
  if (!currentPosition?.trim()) return null;
  const upper = currentPosition.trim().toUpperCase();
  const legacy = LEGACY_POSITION_MIGRATION[upper];
  if (legacy) return legacy;

  const code = normalizeFootballPositionCode(currentPosition);
  if (!code) return null;

  const canonical = toCanonicalUpper(currentPosition);
  if (FOOTBALL_POSITION_CODES.includes(canonical as FootballPositionCode) && canonical === code) {
    const defaults = FIELD_POSITION_DEFAULTS[code];
    return {
      code,
      fieldPositionX: currentX ?? defaults.x,
      fieldPositionY: currentY ?? defaults.y,
    };
  }

  return null;
}
