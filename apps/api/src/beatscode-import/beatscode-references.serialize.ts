import type { BeatscodeBankAccountInfo, BeatscodeLookupContext } from './beatscode-lookups.util';

export type SerializedBeatscodeReferences = {
  positions: Array<Record<string, unknown>>;
  feet: Array<Record<string, unknown>>;
  genders: Array<Record<string, unknown>>;
  maritalStatuses: Array<Record<string, unknown>>;
  bloodTypes: Array<Record<string, unknown>>;
  contacts: Array<Record<string, unknown>>;
  contactTypes: Array<Record<string, unknown>>;
  cities: Array<Record<string, unknown>>;
  countries: Array<Record<string, unknown>>;
  banks: Array<Record<string, unknown>>;
  bankAccounts?: Array<Record<string, unknown>>;
  breeds?: Array<Record<string, unknown>>;
  schoolings?: Array<Record<string, unknown>>;
  characteristics: Array<Record<string, unknown>>;
  documentTypes: Array<Record<string, unknown>>;
};

export function serializeBeatscodeReferences(bundle: {
  lookups: BeatscodeLookupContext;
  characteristicsById: Map<number, unknown>;
  documentTypes?: Array<Record<string, unknown>>;
}): SerializedBeatscodeReferences {
  const { lookups, characteristicsById } = bundle;
  return {
    positions: [...lookups.positionById.entries()].map(([id, v]) => ({ id, ...v })),
    feet: [...lookups.footById.entries()].map(([id, foot]) => ({ id, name: foot })),
    genders: [...lookups.genderById.entries()].map(([id, value]) => ({ id, value })),
    maritalStatuses: [...lookups.maritalById.entries()].map(([id, value]) => ({ id, value })),
    bloodTypes: [...lookups.bloodTypeById.entries()].map(([id, value]) => ({ id, value })),
    contacts: [...lookups.contactById.entries()].map(([id, c]) => ({ id, ...c })),
    contactTypes: [...lookups.contactTypeById.entries()].map(([id, name]) => ({ id, name })),
    cities: [...lookups.cityById.entries()].map(([id, name]) => ({ id, name })),
    countries: [...lookups.countryById.entries()].map(([id, name]) => ({ id, name })),
    banks: [...lookups.bankById.entries()].map(([id, name]) => ({ id, name })),
    bankAccounts: [...lookups.bankAccountById.entries()].map(([id, row]) => ({ id, ...row })),
    breeds: [...lookups.breedById.entries()].map(([id, name]) => ({ id, name })),
    schoolings: [...lookups.schoolingById.entries()].map(([id, name]) => ({ id, name })),
    characteristics: [...characteristicsById.entries()].map(([id, row]) => ({
      id,
      ...(row as Record<string, unknown>),
    })),
    documentTypes: bundle.documentTypes ?? [],
  };
}

export function deserializeBeatscodeReferences(raw: SerializedBeatscodeReferences): {
  lookups: BeatscodeLookupContext;
  characteristicsById: Map<
    number,
    { technical?: string; tactical?: string; physical?: string; additional?: string }
  >;
} {
  const positionById = new Map<number, { acronym: string; name: string }>();
  for (const p of raw.positions) {
    const id = Number(p.id);
    if (!Number.isFinite(id)) continue;
    positionById.set(id, {
      acronym: String(p.acronym ?? '').trim(),
      name: String(p.name ?? '').trim(),
    });
  }

  const footById = new Map<number, 'left' | 'right' | 'both'>();
  for (const f of raw.feet) {
    const id = Number(f.id);
    const foot = String(f.name ?? f.foot ?? '').toLowerCase();
    if (!Number.isFinite(id)) continue;
    if (foot.includes('left') || foot.includes('esquer')) footById.set(id, 'left');
    else if (foot.includes('right') || foot.includes('direit')) footById.set(id, 'right');
    else if (foot.includes('both') || foot.includes('ambid')) footById.set(id, 'both');
  }

  const genderById = new Map<number, string>();
  for (const g of raw.genders) {
    const id = Number(g.id);
    const value = String(g.value ?? g.name ?? '').trim();
    if (Number.isFinite(id) && value) genderById.set(id, value);
  }

  const maritalById = new Map<number, string>();
  for (const m of raw.maritalStatuses) {
    const id = Number(m.id);
    const value = String(m.value ?? m.name ?? '').trim();
    if (Number.isFinite(id) && value) maritalById.set(id, value);
  }

  const bloodTypeById = new Map<number, string>();
  for (const b of raw.bloodTypes) {
    const id = Number(b.id);
    const value = String(b.value ?? b.name ?? '').trim();
    if (Number.isFinite(id) && value) bloodTypeById.set(id, value);
  }

  const contactTypeById = new Map<number, string>();
  for (const t of raw.contactTypes) {
    const id = Number(t.id);
    if (Number.isFinite(id)) contactTypeById.set(id, String(t.name ?? '').trim().toLowerCase());
  }

  const contactById = new Map<number, { value: string; contactTypeId: number; typeName?: string }>();
  for (const c of raw.contacts) {
    const id = Number(c.id);
    const value = String(c.value ?? '').trim();
    const contactTypeId = Number(c.contactTypeId);
    if (!Number.isFinite(id) || !value) continue;
    contactById.set(id, {
      value,
      contactTypeId: Number.isFinite(contactTypeId) ? contactTypeId : 0,
      typeName: c.typeName ? String(c.typeName) : contactTypeById.get(contactTypeId),
    });
  }

  const cityById = new Map<number, string>();
  for (const c of raw.cities) {
    const id = Number(c.id);
    const name = String(c.name ?? '').trim();
    if (Number.isFinite(id) && name) cityById.set(id, name);
  }

  const countryById = new Map<number, string>();
  for (const c of raw.countries) {
    const id = Number(c.id);
    const name = String(c.name ?? '').trim();
    if (Number.isFinite(id) && name) countryById.set(id, name);
  }

  const bankById = new Map<number, string>();
  for (const b of raw.banks) {
    const id = Number(b.id);
    const name = String(b.name ?? '').trim();
    if (Number.isFinite(id) && name) bankById.set(id, name);
  }

  const bankAccountById = new Map<number, BeatscodeBankAccountInfo>();
  for (const row of raw.bankAccounts ?? []) {
    const id = Number(row.id);
    if (!Number.isFinite(id)) continue;
    bankAccountById.set(id, {
      bankName: str(row.bankName),
      agency: str(row.agency),
      accountNumber: str(row.accountNumber),
      accountType: str(row.accountType),
    });
  }

  const breedById = new Map<number, string>();
  for (const row of raw.breeds ?? []) {
    const id = Number(row.id);
    const name = String(row.name ?? '').trim();
    if (Number.isFinite(id) && name) breedById.set(id, name);
  }

  const schoolingById = new Map<number, string>();
  for (const row of raw.schoolings ?? []) {
    const id = Number(row.id);
    const name = String(row.name ?? '').trim();
    if (Number.isFinite(id) && name) schoolingById.set(id, name);
  }

  const characteristicsById = new Map<
    number,
    { technical?: string; tactical?: string; physical?: string; additional?: string }
  >();
  for (const row of raw.characteristics) {
    const id = Number(row.id);
    if (!Number.isFinite(id)) continue;
    characteristicsById.set(id, {
      technical: str(row.technical ?? row.technicalDescription),
      tactical: str(row.tactical ?? row.tacticalDescription),
      physical: str(row.physical ?? row.physicalDescription),
      additional: str(row.additional ?? row.additionalInformation),
    });
  }

  return {
    lookups: {
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
    },
    characteristicsById,
  };
}

function str(v: unknown): string | undefined {
  const s = String(v ?? '').trim();
  return s || undefined;
}
