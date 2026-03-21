/** Compara nomes de times (trim, NFC, pt-BR case-insensitive) para evitar "sumir" no select. */
export function normalizeNameKey(s: string): string {
  return s.trim().normalize("NFC").toLocaleLowerCase("pt-BR");
}

/**
 * Chave única para merge de adversários (cadastro + S3): remove acentos, hífens e
 * tudo que não for letra/número, para unificar "América-MG" com "AmericaMG".
 */
export function normalizeTeamNameKeyForMerge(s: string): string {
  let t = s.trim().normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");
  t = t.replace(/\b(de|da|do|das|dos)\b/g, "");
  return t.replace(/[^a-z0-9]/g, "");
}

export function namesMatch(a: string | undefined, b: string | undefined): boolean {
  if (a == null || b == null) return false;
  if (normalizeNameKey(a) === normalizeNameKey(b)) return true;
  return normalizeTeamNameKeyForMerge(a) === normalizeTeamNameKeyForMerge(b);
}
