import { normalizeBankName } from './brazil-banks.util';
import { normalizeCityName } from './brazil-location.util';
import { normalizeRegistrationProfileSituation } from './sports-situation.util';

function normalizeAddressBlock(block: unknown): unknown {
  if (!block || typeof block !== 'object' || Array.isArray(block)) return block;
  const obj = block as Record<string, unknown>;
  const city = typeof obj.city === 'string' ? normalizeCityName(obj.city) : obj.city;
  return city === obj.city ? block : { ...obj, city: city || undefined };
}

function normalizeStringField(obj: Record<string, unknown>, key: string): Record<string, unknown> {
  const raw = obj[key];
  if (typeof raw !== 'string' || !raw.trim()) return obj;
  const normalized = normalizeCityName(raw);
  if (normalized === raw) return obj;
  return { ...obj, [key]: normalized || undefined };
}

/** Normaliza cidades, bancos e situação esportiva no perfil de cadastro. */
export function normalizeRegistrationProfile(profile: unknown): unknown {
  const withSituation = normalizeRegistrationProfileSituation(profile);
  if (!withSituation || typeof withSituation !== 'object' || Array.isArray(withSituation)) {
    return withSituation;
  }

  const root = withSituation as Record<string, unknown>;
  let next = { ...root };

  const address = root.address;
  if (address && typeof address === 'object' && !Array.isArray(address)) {
    const addressObj = address as Record<string, unknown>;
    next = {
      ...next,
      address: {
        ...addressObj,
        main: normalizeAddressBlock(addressObj.main),
        local: normalizeAddressBlock(addressObj.local),
      },
    };
  }

  const sports = root.sports;
  if (sports && typeof sports === 'object' && !Array.isArray(sports)) {
    let sportsObj = sports as Record<string, unknown>;
    sportsObj = normalizeStringField(sportsObj, 'footballSchoolCity');
    sportsObj = normalizeStringField(sportsObj, 'previousClubCity');
    next = { ...next, sports: sportsObj };
  }

  const extras = root.extras;
  if (extras && typeof extras === 'object' && !Array.isArray(extras)) {
    const extrasObj = extras as Record<string, unknown>;
    let patched = { ...extrasObj };
    if (typeof extrasObj.bankName === 'string' && extrasObj.bankName.trim()) {
      const bankName = normalizeBankName(extrasObj.bankName);
      if (bankName !== extrasObj.bankName) patched = { ...patched, bankName };
    }
    if (typeof extrasObj.pixBank === 'string' && extrasObj.pixBank.trim()) {
      const pixBank = normalizeBankName(extrasObj.pixBank);
      if (pixBank !== extrasObj.pixBank) patched = { ...patched, pixBank };
    }
    patched = normalizeStringField(patched, 'voterCity');
    next = { ...next, extras: patched };
  }

  return next;
}
