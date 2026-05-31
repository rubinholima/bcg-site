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

/** Match flexível para tabela × jogos (Mamoré ↔ EC Mamoré, Villa Nova ↔ Villa Nova SAF). */
export function teamsMatchForStandings(
  standingsName: string | undefined,
  fixtureName: string | undefined,
): boolean {
  if (!standingsName?.trim() || !fixtureName?.trim()) return false;
  if (namesMatch(standingsName, fixtureName)) return true;
  const a = normalizeTeamNameKeyForMerge(standingsName);
  const b = normalizeTeamNameKeyForMerge(fixtureName);
  if (!a || !b) return false;
  if (a === b) return true;
  const minLen = 4;
  if (a.length >= minLen && b.length >= minLen && (a.includes(b) || b.includes(a))) {
    return true;
  }
  return false;
}

/** Campeonato da tabela × nome do jogo (Mineirão ↔ MINEIRO MÓDULO II 2026). */
export function competitionMatchForStandings(
  tableCompetition: string | undefined,
  fixtureCompetition: string | undefined,
): boolean {
  if (!tableCompetition?.trim()) return true;
  if (!fixtureCompetition?.trim()) return true;
  if (namesMatch(tableCompetition, fixtureCompetition)) return true;
  const a = normalizeTeamNameKeyForMerge(tableCompetition);
  const b = normalizeTeamNameKeyForMerge(fixtureCompetition);
  if (!a || !b) return true;
  return a.includes(b) || b.includes(a);
}
