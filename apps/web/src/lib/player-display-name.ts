import { parseRegistrationProfile } from "@/lib/player-registration-profile";

/** Nome exibido na lista de atletas: apelido → primeiro nome → nome completo (MAIÚSCULAS). */
export function getPlayerListDisplayName(player: {
  name: string;
  registrationProfile?: unknown;
}): string {
  const profile = parseRegistrationProfile(player.registrationProfile);
  const nickname = profile.personal?.nickname?.trim();
  let label: string;
  if (nickname) {
    label = nickname;
  } else {
    const parts = player.name.trim().split(/\s+/).filter(Boolean);
    label = parts[0] || player.name.trim() || "—";
  }
  return label.toLocaleUpperCase("pt-BR");
}

export function comparePlayersByDisplayName(
  a: { name: string; registrationProfile?: unknown },
  b: { name: string; registrationProfile?: unknown },
): number {
  return getPlayerListDisplayName(a).localeCompare(getPlayerListDisplayName(b), "pt-BR", {
    sensitivity: "base",
  });
}
