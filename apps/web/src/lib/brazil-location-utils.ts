/** Normaliza nome de cidade para exibição e filtros consistentes. */
export function normalizeCityName(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  const lower = trimmed.toLocaleLowerCase("pt-BR");
  const prepositions = new Set(["de", "da", "do", "das", "dos", "e"]);

  return lower
    .split(" ")
    .map((word, index) => {
      if (index > 0 && prepositions.has(word)) return word;
      return word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1);
    })
    .join(" ");
}

/** Chave para comparação/filtro — ignora acentos e caixa. */
export function normalizeCityKey(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
