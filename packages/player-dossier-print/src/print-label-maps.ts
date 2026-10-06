const CATEGORY_LABELS: Record<string, string> = {
  principal: "Principal",
  modulo_ii: "Módulo II",
  sub20: "Sub-20",
  sub17: "Sub-17",
  sub15: "Sub-15",
  sub14: "Sub-14",
  sub13: "Sub-13",
  sub12: "Sub-12",
  sub11: "Sub-11",
  sub9: "Sub-9",
  feminino: "Feminino",
};

const POSITION_LABELS: Record<string, string> = {
  GOLEIRO: "Goleiro",
  ZAGUEIRO: "Zagueiro",
  "LATERAL ESQUERDO": "Lateral Esquerdo",
  "LATERAL DIREITO": "Lateral Direito",
  VOLANTE: "Volante",
  "MEIO-CAMPO": "Meio-campo",
  EXTREMO: "Extremo",
  CENTROAVANTE: "Centroavante",
};

export function getCategoryLabel(value: string, _lang: "pt" | "en" = "pt"): string {
  const key = value.trim().toLowerCase();
  return CATEGORY_LABELS[key] ?? value;
}

export function getPositionLabel(value: string): string {
  const upper = value.trim().toUpperCase();
  return POSITION_LABELS[upper] ?? value;
}
