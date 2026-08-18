/** Nome exibido na lista de atletas: apelido → nome completo (MAIÚSCULAS). */
export function getPlayerListDisplayName(player: {
  name: string;
  registrationProfile?: unknown;
}): string {
  const nickname = extractPlayerNickname(player.registrationProfile);
  const label = nickname || player.name.trim() || "—";
  return label.toLocaleUpperCase("pt-BR");
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

export function comparePlayersByDisplayName(
  a: { name: string; registrationProfile?: unknown },
  b: { name: string; registrationProfile?: unknown },
): number {
  return getPlayerListDisplayName(a).localeCompare(getPlayerListDisplayName(b), "pt-BR", {
    sensitivity: "base",
  });
}
