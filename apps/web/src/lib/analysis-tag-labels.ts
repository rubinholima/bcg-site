export const OUTCOME_LABELS: Record<string, string> = {
  certo: "Certo",
  errado: "Errado",
  gol: "Gol",
  defesa: "Defesa",
  fora: "Fora",
  bloqueada: "Bloqueada",
  vencido: "Ganho",
  perdido: "Perdido",
  neutro: "—",
  a_favor: "A favor",
  contra: "Contra",
  saved: "Defesa",
  off_target: "Fora",
  blocked: "Bloqueada",
  successful: "Certo",
  unsuccessful: "Errado",
};

export const QUALIFIER_LABELS: Record<string, string> = {
  aerial: "Aéreo",
  ground: "Chão",
  passe: "Passe",
  bola_longa: "Bola longa",
  conducao: "Condução",
  pass: "Passe",
  long_ball: "Bola longa",
  carry: "Condução",
};

export function labelOutcome(key: string): string {
  return OUTCOME_LABELS[key] ?? key.replace(/_/g, " ");
}

export function labelQualifier(key: string): string {
  return QUALIFIER_LABELS[key] ?? key.replace(/_/g, " ");
}

export function parseStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}
