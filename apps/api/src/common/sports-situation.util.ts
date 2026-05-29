/** Valores canônicos em pt-BR para registrationProfile.sports.situation */
export const SPORTS_SITUATION_VALUES = ['ativo', 'emprestado', 'teste', 'desligado'] as const;

export type SportsSituation = (typeof SPORTS_SITUATION_VALUES)[number];

const BEATSCODE_AND_LEGACY_MAP: Record<string, SportsSituation> = {
  // pt-BR
  ativo: 'ativo',
  emprestado: 'emprestado',
  teste: 'teste',
  desligado: 'desligado',
  inativo: 'desligado',
  elenco: 'ativo',
  // Beatscode (inglês / typos)
  definitive: 'ativo',
  active: 'ativo',
  inative: 'desligado',
  inactive: 'desligado',
  loaned: 'emprestado',
  loan: 'emprestado',
  trial: 'teste',
  test: 'teste',
};

export function normalizeSportsSituation(value?: string | null): SportsSituation {
  const raw = value?.trim();
  if (!raw) return 'ativo';
  const key = raw.toLowerCase();
  return BEATSCODE_AND_LEGACY_MAP[key] ?? (SPORTS_SITUATION_VALUES.includes(key as SportsSituation) ? (key as SportsSituation) : 'ativo');
}

export function isArchivedSportsSituation(value?: string | null): boolean {
  return normalizeSportsSituation(value) === 'desligado';
}

export function isLoanedSportsSituation(value?: string | null): boolean {
  return normalizeSportsSituation(value) === 'emprestado';
}

export function normalizeRegistrationProfileSituation(profile: unknown): unknown {
  if (!profile || typeof profile !== 'object' || Array.isArray(profile)) return profile;
  const root = profile as Record<string, unknown>;
  const sports = root.sports;
  if (!sports || typeof sports !== 'object' || Array.isArray(sports)) return profile;
  const sportsObj = sports as Record<string, unknown>;
  const raw = sportsObj.situation;
  if (raw !== undefined && raw !== null && typeof raw !== 'string') return profile;
  return {
    ...root,
    sports: {
      ...sportsObj,
      situation: normalizeSportsSituation(typeof raw === 'string' ? raw : null),
    },
  };
}
