/** Apelido → nome completo, sempre em maiúsculas (listas de atletas). */
export function getPlayerListDisplayName(player: {
  name: string;
  registrationProfile?: unknown;
}): string {
  const nickname = extractPlayerNickname(player.registrationProfile);
  const label = nickname || player.name.trim() || '—';
  return label.toLocaleUpperCase('pt-BR');
}

function extractPlayerNickname(registrationProfile: unknown): string | null {
  if (!registrationProfile || typeof registrationProfile !== 'object' || Array.isArray(registrationProfile)) {
    return null;
  }
  const personal = (registrationProfile as Record<string, unknown>).personal;
  if (!personal || typeof personal !== 'object' || Array.isArray(personal)) return null;
  const nickname = (personal as Record<string, unknown>).nickname;
  return typeof nickname === 'string' && nickname.trim() ? nickname.trim() : null;
}
