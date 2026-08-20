export type FmfLinkablePlayer = {
  id: string;
  name: string;
};

export function normalizeFmfPlayerName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function buildPlayersByNormalizedName<T extends FmfLinkablePlayer>(
  players: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const player of players) {
    const key = normalizeFmfPlayerName(player.name);
    if (!key) continue;
    map.set(key, [...(map.get(key) ?? []), player]);
  }
  return map;
}

export type FmfStatLinkInput = {
  cbfRegistration: string;
  sourceName: string;
};

export type FmfStatLinkResult =
  | { ok: true; playerId: string; linkedBy: 'cbf' | 'name' }
  | { ok: false; reason: string };

/** Vincula stat da súmula ao cadastro — sem heurística por camisa ou sobrenome. */
export function resolvePlayerForFmfStat<T extends FmfLinkablePlayer>(
  stat: FmfStatLinkInput,
  playersByCbf: Map<string, T[]>,
  playersByName: Map<string, T[]>,
): FmfStatLinkResult {
  const cbfMatches = playersByCbf.get(stat.cbfRegistration) ?? [];
  if (cbfMatches.length === 1) {
    return { ok: true, playerId: cbfMatches[0]!.id, linkedBy: 'cbf' };
  }
  if (cbfMatches.length > 1) {
    return { ok: false, reason: 'Registro CBF duplicado no cadastro' };
  }

  const nameKey = normalizeFmfPlayerName(stat.sourceName);
  if (nameKey) {
    const nameMatches = playersByName.get(nameKey) ?? [];
    if (nameMatches.length === 1) {
      return { ok: true, playerId: nameMatches[0]!.id, linkedBy: 'name' };
    }
    if (nameMatches.length > 1) {
      return { ok: false, reason: 'Nome duplicado no cadastro (sem CBF único)' };
    }
  }

  return { ok: false, reason: 'Registro CBF não encontrado no cadastro do atleta' };
}
