/** Posições de futebol com nomes completos (para exibição e select). */
export const FOOTBALL_POSITIONS = [
  { value: "GK", label: "Goleiro" },
  { value: "CB", label: "Zagueiro Central" },
  { value: "LB", label: "Lateral Esquerdo" },
  { value: "RB", label: "Lateral Direito" },
  { value: "LWB", label: "Ala Esquerdo" },
  { value: "RWB", label: "Ala Direito" },
  { value: "CDM", label: "Volante" },
  { value: "CM", label: "Meio-Campista" },
  { value: "CAM", label: "Meia-Atacante" },
  { value: "LM", label: "Meia Esquerda" },
  { value: "RM", label: "Meia Direita" },
  { value: "LW", label: "Ponta Esquerda" },
  { value: "RW", label: "Ponta Direita" },
  { value: "CF", label: "Atacante" },
  { value: "ST", label: "Centroavante" },
] as const;

/** Códigos alternativos (planilha/import) que mapeiam para um value conhecido. */
const POSITION_ALIASES: Record<string, string> = {
  MEI: "CM",
  Meia: "CM",
  MEC: "CM",
  VOL: "CDM",
  ATA: "ST",
  PON: "LW",
  LAT: "LB",
  ZAG: "CB",
  GOL: "GK",
};

/** Retorna o nome completo da posição; se não for um código conhecido, devolve o valor original. */
export function getPositionLabel(value: string | undefined | null): string {
  if (value == null || value === "") return "";
  const normalized = value.trim();
  const alias = POSITION_ALIASES[normalized] ?? POSITION_ALIASES[normalized.toUpperCase()];
  const key = alias ?? normalized;
  const pos = FOOTBALL_POSITIONS.find((p) => p.value.toUpperCase() === key.toUpperCase());
  return pos ? pos.label : value;
}
