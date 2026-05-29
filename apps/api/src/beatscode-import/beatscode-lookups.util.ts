import {
  mapBeatscodeBloodTypeName,
  mapBeatscodeGenderName,
  mapBeatscodeMaritalName,
} from './beatscode-value-maps.util';

export type BeatscodeLookupContext = {
  positionById: Map<number, { acronym: string; name: string }>;
  footById: Map<number, 'left' | 'right' | 'both'>;
  genderById: Map<number, string>;
  maritalById: Map<number, string>;
  bloodTypeById: Map<number, string>;
  cityById: Map<number, string>;
  countryById: Map<number, string>;
  bankById: Map<number, string>;
  contactById: Map<number, { value: string; contactTypeId: number; typeName?: string }>;
  contactTypeById: Map<number, string>;
};

export type BeatscodeLookupInput = {
  positions: Array<Record<string, unknown>>;
  feet: Array<Record<string, unknown>>;
  genders?: Array<Record<string, unknown>>;
  maritalStatuses?: Array<Record<string, unknown>>;
  bloodTypes?: Array<Record<string, unknown>>;
  contacts?: Array<Record<string, unknown>>;
  contactTypes?: Array<Record<string, unknown>>;
  cities?: Array<Record<string, unknown>>;
  countries?: Array<Record<string, unknown>>;
  banks?: Array<Record<string, unknown>>;
};

/** Fallback Boston City FC — espelha GET /position?route=/settings/position (mai/2026). */
export const BEATSCODE_FALLBACK_POSITIONS: Array<{ id: number; acronym: string; name: string }> = [
  { id: 1, acronym: 'GOL', name: 'Goleiro' },
  { id: 2, acronym: 'ZAG', name: 'Zagueiro' },
  { id: 3, acronym: 'LAT', name: 'Lateral' },
  { id: 4, acronym: 'VOL', name: 'Volante' },
  { id: 5, acronym: 'MEI', name: 'Meio Campo' },
  { id: 6, acronym: 'ATA', name: 'Atacante' },
  { id: 50, acronym: 'LP', name: 'Lateral/Ponta' },
  { id: 51, acronym: 'EXT', name: 'Extremo' },
  { id: 52, acronym: 'L.E', name: 'Lateral Esquerdo' },
  { id: 53, acronym: 'L.D', name: 'Lateral Direito' },
];

const BEATSCODE_FALLBACK_FEET: Array<{ id: number; foot: 'left' | 'right' | 'both' }> = [
  { id: 1, foot: 'right' },
  { id: 2, foot: 'left' },
  { id: 3, foot: 'both' },
];

const ACRONYM_TO_BCG_POSITION: Record<string, string> = {
  GOL: 'GK',
  ZAG: 'CB',
  LAT: 'LB',
  VOL: 'CDM',
  MEI: 'CM',
  ATA: 'ST',
  LP: 'LW',
  EXT: 'RW',
  'L.E': 'LB',
  'L.D': 'RB',
};

export function buildBeatscodeLookupContext(input: BeatscodeLookupInput): BeatscodeLookupContext {
  const positionById = new Map<number, { acronym: string; name: string }>();
  for (const p of input.positions) {
    const id = Number(p.id);
    if (!Number.isFinite(id)) continue;
    positionById.set(id, {
      acronym: String(p.acronym ?? '').trim(),
      name: String(p.name ?? '').trim(),
    });
  }
  if (positionById.size === 0) {
    for (const p of BEATSCODE_FALLBACK_POSITIONS) {
      positionById.set(p.id, { acronym: p.acronym, name: p.name });
    }
  }

  const footById = new Map<number, 'left' | 'right' | 'both'>();
  for (const f of input.feet) {
    const id = Number(f.id);
    const name = String(f.name ?? '').toLowerCase();
    if (!Number.isFinite(id)) continue;
    if (name.includes('esquer')) footById.set(id, 'left');
    else if (name.includes('direit')) footById.set(id, 'right');
    else if (name.includes('ambid')) footById.set(id, 'both');
  }
  if (footById.size === 0) {
    for (const f of BEATSCODE_FALLBACK_FEET) footById.set(f.id, f.foot);
  }

  const genderById = new Map<number, string>();
  for (const g of input.genders ?? []) {
    const id = Number(g.id);
    const mapped = mapBeatscodeGenderName(String(g.name ?? ''));
    if (Number.isFinite(id) && mapped) genderById.set(id, mapped);
  }

  const maritalById = new Map<number, string>();
  for (const m of input.maritalStatuses ?? []) {
    const id = Number(m.id);
    const mapped = mapBeatscodeMaritalName(String(m.name ?? ''));
    if (Number.isFinite(id) && mapped) maritalById.set(id, mapped);
  }

  const bloodTypeById = new Map<number, string>();
  for (const b of input.bloodTypes ?? []) {
    const id = Number(b.id);
    const mapped = mapBeatscodeBloodTypeName(String(b.name ?? ''));
    if (Number.isFinite(id) && mapped) bloodTypeById.set(id, mapped);
  }

  const contactTypeById = new Map<number, string>();
  for (const t of input.contactTypes ?? []) {
    const id = Number(t.id);
    if (Number.isFinite(id)) contactTypeById.set(id, String(t.name ?? '').trim().toLowerCase());
  }

  const contactById = new Map<number, { value: string; contactTypeId: number; typeName?: string }>();
  for (const c of input.contacts ?? []) {
    const id = Number(c.id);
    const value = String(c.value ?? '').trim();
    const contactTypeId = Number(c.contactTypeId);
    if (!Number.isFinite(id) || !value) continue;
    contactById.set(id, {
      value,
      contactTypeId: Number.isFinite(contactTypeId) ? contactTypeId : 0,
      typeName: contactTypeById.get(contactTypeId),
    });
  }

  const cityById = new Map<number, string>();
  for (const c of input.cities ?? []) {
    const id = Number(c.id);
    const name = String(c.name ?? '').trim();
    if (Number.isFinite(id) && name) cityById.set(id, name);
  }

  const countryById = new Map<number, string>();
  for (const c of input.countries ?? []) {
    const id = Number(c.id);
    const name = String(c.name ?? '').trim();
    if (Number.isFinite(id) && name) countryById.set(id, name);
  }

  const bankById = new Map<number, string>();
  for (const b of input.banks ?? []) {
    const id = Number(b.id);
    const name = String(b.name ?? '').trim();
    if (Number.isFinite(id) && name) bankById.set(id, name);
  }

  return {
    positionById,
    footById,
    genderById,
    maritalById,
    bloodTypeById,
    cityById,
    countryById,
    bankById,
    contactById,
    contactTypeById,
  };
}

export function defaultBeatscodeLookupContext(): BeatscodeLookupContext {
  return buildBeatscodeLookupContext({
    positions: BEATSCODE_FALLBACK_POSITIONS.map((p) => ({ id: p.id, acronym: p.acronym, name: p.name })),
    feet: BEATSCODE_FALLBACK_FEET.map((f) => ({
      id: f.id,
      name: f.foot === 'left' ? 'Esquerdo' : f.foot === 'right' ? 'Direito' : 'Ambidestro',
    })),
  });
}

export function mapBeatscodeAcronymToBcgPosition(acronym?: string | null): string | undefined {
  const key = acronym?.trim();
  if (!key) return undefined;
  return ACRONYM_TO_BCG_POSITION[key] ?? ACRONYM_TO_BCG_POSITION[key.toUpperCase()];
}

export function resolveBeatscodePositionId(
  positionId: unknown,
  lookups: BeatscodeLookupContext,
): string | undefined {
  const id = Number(positionId);
  if (!Number.isFinite(id)) return undefined;
  const row = lookups.positionById.get(id);
  if (!row) return undefined;
  return mapBeatscodeAcronymToBcgPosition(row.acronym) ?? row.acronym;
}

export function resolveBeatscodeDominantFootId(
  footId: unknown,
  lookups: BeatscodeLookupContext,
): string | undefined {
  const id = Number(footId);
  if (!Number.isFinite(id)) return undefined;
  return lookups.footById.get(id);
}

export function resolveBeatscodeCityId(cityId: unknown, lookups: BeatscodeLookupContext): string | undefined {
  const id = Number(cityId);
  if (!Number.isFinite(id)) return undefined;
  return lookups.cityById.get(id);
}

export function resolveBeatscodeCountryId(
  countryId: unknown,
  lookups: BeatscodeLookupContext,
): string | undefined {
  const id = Number(countryId);
  if (!Number.isFinite(id)) return undefined;
  return lookups.countryById.get(id);
}

export type ResolvedBeatscodeContacts = {
  emails: string[];
  phones: string[];
  primaryEmail?: string;
  primaryPhone?: string;
};

export function resolveBeatscodeContacts(
  contactIds: unknown,
  lookups: BeatscodeLookupContext,
): ResolvedBeatscodeContacts {
  const ids = Array.isArray(contactIds) ? contactIds : [];
  const emails: string[] = [];
  const phones: string[] = [];

  for (const rawId of ids) {
    const contact = lookups.contactById.get(Number(rawId));
    if (!contact?.value) continue;
    const type = contact.typeName ?? lookups.contactTypeById.get(contact.contactTypeId) ?? '';
    if (type.includes('email') || contact.value.includes('@')) {
      if (!emails.includes(contact.value)) emails.push(contact.value);
    } else if (type.includes('phone') || type.includes('telefone') || /[\d()+-]/.test(contact.value)) {
      if (!phones.includes(contact.value)) phones.push(contact.value);
    }
  }

  return {
    emails,
    phones,
    primaryEmail: emails[0],
    primaryPhone: phones[0],
  };
}

export function normalizeBeatscodeJerseyNumber(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}
