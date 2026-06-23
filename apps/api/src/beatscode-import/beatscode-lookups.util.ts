import {
  mapBeatscodeBloodTypeName,
  mapBeatscodeGenderName,
  mapBeatscodeMaritalName,
} from './beatscode-value-maps.util';

export type BeatscodeBankAccountInfo = {
  bankName?: string;
  agency?: string;
  accountNumber?: string;
  accountType?: string;
};

export type BeatscodeLookupContext = {
  positionById: Map<number, { acronym: string; name: string }>;
  footById: Map<number, 'left' | 'right' | 'both'>;
  genderById: Map<number, string>;
  maritalById: Map<number, string>;
  bloodTypeById: Map<number, string>;
  cityById: Map<number, string>;
  countryById: Map<number, string>;
  bankById: Map<number, string>;
  bankAccountById: Map<number, BeatscodeBankAccountInfo>;
  breedById: Map<number, string>;
  schoolingById: Map<number, string>;
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
  bankAccounts?: Array<Record<string, unknown>>;
  breeds?: Array<Record<string, unknown>>;
  schoolings?: Array<Record<string, unknown>>;
};

/** Fallback Boston City FC — posições canônicas BCG. */
export const BEATSCODE_FALLBACK_POSITIONS: Array<{ id: number; acronym: string; name: string }> = [
  { id: 1, acronym: 'GOL', name: 'Goleiro' },
  { id: 2, acronym: 'ZAG', name: 'Zagueiro' },
  { id: 52, acronym: 'L.E', name: 'Lateral Esquerdo' },
  { id: 53, acronym: 'L.D', name: 'Lateral Direito' },
  { id: 4, acronym: 'VOL', name: 'Volante' },
  { id: 5, acronym: 'MEI', name: 'Meio-campo' },
  { id: 51, acronym: 'EXT', name: 'Extremo' },
  { id: 6, acronym: 'ATA', name: 'Centroavante' },
];

const BEATSCODE_FALLBACK_FEET: Array<{ id: number; foot: 'left' | 'right' | 'both' }> = [
  { id: 1, foot: 'right' },
  { id: 2, foot: 'left' },
  { id: 3, foot: 'both' },
];

const ACRONYM_TO_BCG_POSITION: Record<string, string> = {
  GOL: 'GOLEIRO',
  ZAG: 'ZAGUEIRO',
  LAT: 'LATERAL ESQUERDO',
  VOL: 'VOLANTE',
  MEI: 'MEIO-CAMPO',
  ATA: 'CENTROAVANTE',
  LP: 'EXTREMO',
  EXT: 'EXTREMO',
  'L.E': 'LATERAL ESQUERDO',
  'L.D': 'LATERAL DIREITO',
  GK: 'GOLEIRO',
  CB: 'ZAGUEIRO',
  LB: 'LATERAL ESQUERDO',
  RB: 'LATERAL DIREITO',
  CDM: 'VOLANTE',
  CM: 'MEIO-CAMPO',
  ST: 'CENTROAVANTE',
  LWB: 'LATERAL ESQUERDO',
  RWB: 'LATERAL DIREITO',
  CAM: 'MEIO-CAMPO',
  LM: 'MEIO-CAMPO',
  RM: 'MEIO-CAMPO',
  LW: 'EXTREMO',
  RW: 'EXTREMO',
  CF: 'CENTROAVANTE',
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

  const bankAccountById = new Map<number, BeatscodeBankAccountInfo>();
  for (const row of input.bankAccounts ?? []) {
    const id = Number(row.id);
    if (!Number.isFinite(id)) continue;
    const bankId = Number(row.bankId);
    bankAccountById.set(id, {
      bankName: Number.isFinite(bankId) ? bankById.get(bankId) : String(row.bankName ?? '').trim() || undefined,
      agency: str(row.agency ?? row.agencyNumber),
      accountNumber: str(row.account ?? row.accountNumber ?? row.number),
      accountType: str(row.type ?? row.accountType),
    });
  }

  const breedById = new Map<number, string>();
  for (const row of input.breeds ?? []) {
    const id = Number(row.id);
    const name = String(row.name ?? '').trim();
    if (Number.isFinite(id) && name) breedById.set(id, name);
  }

  const schoolingById = new Map<number, string>();
  for (const row of input.schoolings ?? []) {
    const id = Number(row.id);
    const name = String(row.name ?? '').trim();
    if (Number.isFinite(id) && name) schoolingById.set(id, name);
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
    bankAccountById,
    breedById,
    schoolingById,
    contactById,
    contactTypeById,
  };
}

function str(v: unknown): string | undefined {
  const s = String(v ?? '').trim();
  return s || undefined;
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
