import { parseRegistrationProfile } from "@/lib/player-registration-profile";

/** Nome exibido na lista de atletas: apelido → primeiro nome → nome completo. */
export function getPlayerListDisplayName(player: {
  name: string;
  registrationProfile?: unknown;
}): string {
  const profile = parseRegistrationProfile(player.registrationProfile);
  const nickname = profile.personal?.nickname?.trim();
  if (nickname) return nickname;

  const parts = player.name.trim().split(/\s+/).filter(Boolean);
  if (parts[0]) return parts[0]!;
  return player.name.trim() || "—";
}

export function comparePlayersByDisplayName(
  a: { name: string; registrationProfile?: unknown },
  b: { name: string; registrationProfile?: unknown },
): number {
  return getPlayerListDisplayName(a).localeCompare(getPlayerListDisplayName(b), "pt-BR", {
    sensitivity: "base",
  });
}
