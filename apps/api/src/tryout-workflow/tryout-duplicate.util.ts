export function normalizePersonKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizePhone(phone?: string | null): string | null {
  if (!phone?.trim()) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 ? digits : null;
}

export function normalizeDocument(doc?: string | null): string | null {
  if (!doc?.trim()) return null;
  const digits = doc.replace(/\D/g, '');
  return digits.length >= 11 ? digits : null;
}

export type DuplicateMatchReason =
  | 'prospect_id'
  | 'document'
  | 'name_birth'
  | 'phone'
  | 'email'
  | 'player';

export type DuplicateMatch = {
  kind: 'prospect' | 'player';
  id: string;
  name: string;
  reasons: DuplicateMatchReason[];
  birthDate?: string | null;
  targetCategory?: string | null;
};

export function scoreDuplicateStrength(reasons: DuplicateMatchReason[]): 'strong' | 'weak' {
  if (reasons.includes('document') || reasons.includes('prospect_id')) return 'strong';
  if (reasons.includes('name_birth') && (reasons.includes('phone') || reasons.includes('email'))) {
    return 'strong';
  }
  if (reasons.includes('name_birth')) return 'strong';
  return 'weak';
}
