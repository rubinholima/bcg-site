/** Compara nomes de times (trim, NFC, pt-BR case-insensitive) para evitar "sumir" no select. */
export function normalizeNameKey(s: string): string {
  return s.trim().normalize("NFC").toLocaleLowerCase("pt-BR");
}

export function namesMatch(a: string | undefined, b: string | undefined): boolean {
  if (a == null || b == null) return false;
  return normalizeNameKey(a) === normalizeNameKey(b);
}
