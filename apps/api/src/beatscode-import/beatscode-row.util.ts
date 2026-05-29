export function pickString(row: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k];
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return undefined;
}

export function pickNumber(row: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = row[k];
    if (v == null || v === '') continue;
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export function normalizeDate(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}

export function normalizeBeatscodeRow(row: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = { ...row };

  const photo = row.photo;
  if (photo && typeof photo === 'object' && photo !== null && 'link' in photo) {
    const link = (photo as { link?: unknown }).link;
    if (link != null) next.photo = String(link);
  }

  const address = row.address;
  if (address && typeof address === 'object' && address !== null) {
    const addr = address as Record<string, unknown>;
    next.addressStreet = addr.address;
    next.addressComplement = addr.complement;
    next.addressDistrict = addr.district;
    next.addressCep = addr.cep;
    next.addressCityId = addr.cityId;
  }

  const localAddress = row.localAddress;
  if (localAddress && typeof localAddress === 'object' && localAddress !== null) {
    const addr = localAddress as Record<string, unknown>;
    next.localAddressStreet = addr.address;
    next.localAddressComplement = addr.complement;
    next.localAddressDistrict = addr.district;
    next.localAddressCep = addr.cep;
    next.localAddressCityId = addr.cityId;
  }

  const pix = row.pix;
  if (pix && typeof pix === 'object' && pix !== null) {
    const p = pix as Record<string, unknown>;
    next.pixKeyType = p.keyType;
    next.pixKey = p.key;
    next.pixBankId = p.bankId;
  }

  return next;
}

export function mergeBeatscodeSources(
  athlete: Record<string, unknown>,
  person?: Record<string, unknown>,
  employee?: Record<string, unknown>,
): Record<string, unknown> {
  return normalizeBeatscodeRow({
    ...(person ?? {}),
    ...(employee ?? {}),
    ...athlete,
  });
}

export type AddressBlockInput = {
  street?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  zipCode?: string;
};

export function buildAddressBlock(
  row: Record<string, unknown>,
  prefix: '' | 'local',
  cityName?: string,
): AddressBlockInput | undefined {
  const p = prefix ? `${prefix}Address` : 'address';
  const street = pickString(row, [
    prefix ? `${p}Street` : 'addressStreet',
    prefix === 'local' ? 'localAddressStreet' : 'addressStreet',
  ]);
  const complement = pickString(row, [
    prefix ? `${p}Complement` : 'addressComplement',
    prefix === 'local' ? 'localAddressComplement' : 'addressComplement',
  ]);
  const neighborhood = pickString(row, [
    prefix ? `${p}District` : 'addressDistrict',
    prefix === 'local' ? 'localAddressDistrict' : 'addressDistrict',
  ]);
  const zipCode = pickString(row, [
    prefix ? `${p}Cep` : 'addressCep',
    prefix === 'local' ? 'localAddressCep' : 'addressCep',
  ]);

  if (!street && !complement && !neighborhood && !zipCode && !cityName) return undefined;
  return {
    street,
    complement,
    neighborhood,
    city: cityName,
    zipCode,
  };
}

export function stripEmpty<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    if (typeof v === 'object' && !Array.isArray(v)) {
      const nested = stripEmpty(v as Record<string, unknown>);
      if (Object.keys(nested).length > 0) out[k] = nested;
      continue;
    }
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}
