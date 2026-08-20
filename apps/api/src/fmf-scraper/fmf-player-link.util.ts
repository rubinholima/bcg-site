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

function digits(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number'
    ? String(value).replace(/\D/g, '')
    : '';
}

function cbfFromRegistrationProfile(value: unknown): string {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  const sports = (value as { sports?: unknown }).sports;
  if (!sports || typeof sports !== 'object' || Array.isArray(sports)) return '';
  return digits((sports as { cbf?: unknown }).cbf);
}

export function buildPlayersByCbf<
  T extends FmfLinkablePlayer & {
    cbfRegistration?: string | null;
    registrationProfile?: unknown;
  },
>(players: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const player of players) {
    const cbf = digits(player.cbfRegistration) || cbfFromRegistrationProfile(player.registrationProfile);
    if (!cbf) continue;
    map.set(cbf, [...(map.get(cbf) ?? []), player]);
  }
  return map;
}

export type FmfStatLinkInput = {
  cbfRegistration: string;
  sourceName: string;
};

export type FmfStatLinkResult =
  | { ok: true; playerId: string; linkedBy: 'cbf' | 'name' | 'name_contained' | 'name_tokens' }
  | { ok: false; reason: string };

const MIN_CONTAINED_NAME_LENGTH = 12;

function nameTokenSet(value: string): Set<string> {
  return new Set(
    normalizeFmfPlayerName(value)
      .split(' ')
      .filter((t) => t.length > 2),
  );
}

function countSharedNameTokens(a: string, b: string): number {
  const left = nameTokenSet(a);
  let count = 0;
  for (const token of nameTokenSet(b)) {
    if (left.has(token)) count += 1;
  }
  return count;
}

/**
 * Súmula costuma trazer nome completo (ex.: "Joao Victor Machado De Oliveira")
 * e o cadastro só o nome principal ("João Victor Machado") — acento já removido.
 */
export function findUniquePlayerByContainedName<T extends FmfLinkablePlayer>(
  sourceName: string,
  allPlayers: T[],
): T | null {
  const sourceKey = normalizeFmfPlayerName(sourceName);
  if (sourceKey.length < MIN_CONTAINED_NAME_LENGTH) return null;

  const matches = allPlayers.filter((player) => {
    const playerKey = normalizeFmfPlayerName(player.name);
    if (playerKey.length < MIN_CONTAINED_NAME_LENGTH) return false;
    return sourceKey.includes(playerKey) || playerKey.includes(sourceKey);
  });

  return matches.length === 1 ? matches[0]! : null;
}

/** Nome da súmula vs cadastro — 2+ tokens iguais; desempate pelo maior overlap. */
export function findUniquePlayerByNameTokens<T extends FmfLinkablePlayer>(
  sourceName: string,
  allPlayers: T[],
): T | null {
  const sourceSize = nameTokenSet(sourceName).size;
  if (sourceSize === 0) return null;
  const minShared = Math.min(2, sourceSize);

  const scored = allPlayers
    .map((player) => ({
      player,
      score: countSharedNameTokens(sourceName, player.name),
    }))
    .filter((row) => row.score >= minShared)
    .sort((a, b) => b.score - a.score || a.player.name.localeCompare(b.player.name, 'pt-BR'));

  if (scored.length === 0) return null;
  if (scored.length === 1) return scored[0]!.player;
  if (scored[0]!.score > scored[1]!.score) return scored[0]!.player;
  return null;
}

/** Vincula stat da súmula ao cadastro — sem heurística por camisa ou sobrenome. */
export function resolvePlayerForFmfStat<T extends FmfLinkablePlayer>(
  stat: FmfStatLinkInput,
  playersByCbf: Map<string, T[]>,
  playersByName: Map<string, T[]>,
  allPlayers?: T[],
): FmfStatLinkResult {
  const cbfKey = digits(stat.cbfRegistration);
  const cbfMatches = cbfKey ? (playersByCbf.get(cbfKey) ?? []) : [];
  if (cbfMatches.length === 1) {
    return { ok: true, playerId: cbfMatches[0]!.id, linkedBy: 'cbf' };
  }
  if (cbfMatches.length > 1) {
    const byContained = findUniquePlayerByContainedName(stat.sourceName, cbfMatches);
    if (byContained) {
      return { ok: true, playerId: byContained.id, linkedBy: 'cbf' };
    }
    const byTokens = findUniquePlayerByNameTokens(stat.sourceName, cbfMatches);
    if (byTokens) {
      return { ok: true, playerId: byTokens.id, linkedBy: 'cbf' };
    }
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

  if (allPlayers?.length) {
    const byContained = findUniquePlayerByContainedName(stat.sourceName, allPlayers);
    if (byContained) {
      return { ok: true, playerId: byContained.id, linkedBy: 'name_contained' };
    }

    const byTokens = findUniquePlayerByNameTokens(stat.sourceName, allPlayers);
    if (byTokens) {
      return { ok: true, playerId: byTokens.id, linkedBy: 'name_tokens' };
    }
  }

  return { ok: false, reason: 'Registro CBF não encontrado no cadastro do atleta' };
}
