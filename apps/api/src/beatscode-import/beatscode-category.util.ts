/** Mapeia categoria Beatscode → chave BCG (sub20, sub17, sub15, sub14, principal). */
export function mapBeatscodeCategoryName(name: string): string | null {
  const n = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, '');

  if (/sub\s*20|sub20|u20|sub-20/.test(n)) return 'sub20';
  if (/sub\s*17|sub17|u17|sub-17/.test(n)) return 'sub17';
  if (/sub\s*15|sub15|u15|sub-15/.test(n)) return 'sub15';
  if (/sub\s*14|sub14|u14|sub-14/.test(n)) return 'sub14';
  if (/sub\s*13|sub13|u13/.test(n)) return 'sub13';
  if (/sub\s*11|sub11|u11/.test(n)) return 'sub11';
  if (/feminino|women|feminine/.test(n)) return 'feminino';
  if (/principal|profissional|adulto|1equipe|1ªequipe|1equipe/.test(n)) return 'principal';
  return null;
}

/** Fallback quando nationalityId = 1 (comum no Beatscode BR). */
export const BEATSCODE_NATIONALITY_FALLBACK: Record<number, string> = {
  1: 'Brasil',
};

export function slugifyBeatscodeCategoryName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function resolveBeatscodeCategoryKey(name: string): string {
  return mapBeatscodeCategoryName(name) ?? slugifyBeatscodeCategoryName(name);
}
