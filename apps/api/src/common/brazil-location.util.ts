/** Normaliza nome de cidade — espelhar apps/web/src/lib/brazil-location-utils.ts */

export function normalizeCityName(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';

  const lower = trimmed.toLocaleLowerCase('pt-BR');
  const prepositions = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

  return lower
    .split(' ')
    .map((word, index) => {
      if (index > 0 && prepositions.has(word)) return word;
      return word.charAt(0).toLocaleUpperCase('pt-BR') + word.slice(1);
    })
    .join(' ');
}
