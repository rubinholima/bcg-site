import type { BeatscodeApiClient } from './beatscode-api.client';
import { BEATSCODE_NATIONALITY_FALLBACK } from './beatscode-category.util';
import { buildBeatscodeLookupContext, type BeatscodeLookupContext } from './beatscode-lookups.util';

export type BeatscodeReferenceBundle = {
  lookups: BeatscodeLookupContext;
  characteristicsById: Map<
    number,
    { technical?: string; tactical?: string; physical?: string; additional?: string }
  >;
  documentTypes: Array<Record<string, unknown>>;
};

export async function loadBeatscodeReferences(client: BeatscodeApiClient): Promise<BeatscodeReferenceBundle> {
  const [
    positions,
    feet,
    genders,
    maritalStatuses,
    bloodTypes,
    contacts,
    contactTypes,
    cities,
    countries,
    characteristics,
    banks,
    bankAccounts,
    breeds,
    schoolings,
    documentTypes,
  ] = await Promise.all([
    client.listPositions(),
    client.listDominantFeet(),
    client.listByPath('/gender', '/person/athlete'),
    client.listByPath('/marital-status', '/person/athlete'),
    client.listByPath('/blood-type', '/person/athlete'),
    client.listByPath('/contact', '/person/athlete'),
    client.listByPath('/contact-type', '/person/athlete'),
    client.listByPath('/city', '/person/athlete'),
    client.listByPath('/country', '/person/athlete').catch(() => []),
    client.listByPath('/characteristics', '/person/athlete'),
    client.listByPath('/bank', '/person/athlete').catch(() => []),
    client.listByPath('/bank-account', '/person/athlete').catch(() => []),
    client.listByPath('/breed', '/person/athlete').catch(() => []),
    client.listByPath('/schooling', '/person/athlete').catch(() => []),
    client.listByPath('/document-type', '/person/athlete').catch(() => []),
  ]);

  const countriesList: Array<Record<string, unknown>> = [...countries];
  for (const [id, name] of Object.entries(BEATSCODE_NATIONALITY_FALLBACK)) {
    const existing = countriesList.find((c) => Number(c.id) === Number(id));
    if (!existing) countriesList.push({ id: Number(id), name });
  }

  const lookups = buildBeatscodeLookupContext({
    positions,
    feet,
    genders,
    maritalStatuses,
    bloodTypes,
    contacts,
    contactTypes,
    cities,
    countries: countriesList,
    banks,
    bankAccounts,
    breeds,
    schoolings,
  });

  const characteristicsById = new Map<
    number,
    { technical?: string; tactical?: string; physical?: string; additional?: string }
  >();
  for (const row of characteristics) {
    const id = Number(row.id);
    if (!Number.isFinite(id)) continue;
    characteristicsById.set(id, {
      technical: str(row.technicalDescription),
      tactical: str(row.tacticalDescription),
      physical: str(row.physicalDescription),
      additional: str(row.additionalInformation),
    });
  }

  return { lookups, characteristicsById, documentTypes };
}

function str(v: unknown): string | undefined {
  const s = String(v ?? '').trim();
  return s || undefined;
}
