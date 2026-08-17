const BANK_ALIASES: Record<string, string> = {
  nubank: "Nubank",
  "nu pagamentos": "Nubank",
  "nu pagamentos sa": "Nubank",
  "nu bank": "Nubank",
  nu: "Nubank",
  itau: "Itaú",
  "banco itau": "Itaú",
  "itaú unibanco": "Itaú",
  bradesco: "Bradesco",
  "banco bradesco": "Bradesco",
  santander: "Santander",
  caixa: "Caixa Econômica Federal",
  "caixa economica": "Caixa Econômica Federal",
  "caixa economica federal": "Caixa Econômica Federal",
  bb: "Banco do Brasil",
  "banco do brasil": "Banco do Brasil",
  inter: "Banco Inter",
  "banco inter": "Banco Inter",
  sicredi: "Sicredi",
  sicoob: "Sicoob",
  safra: "Safra",
  "banco safra": "Safra",
  c6: "C6 Bank",
  "c6 bank": "C6 Bank",
  original: "Banco Original",
  "banco original": "Banco Original",
  pan: "Banco Pan",
  "banco pan": "Banco Pan",
};

export const BRAZIL_BANK_SUGGESTIONS = [
  "Nubank",
  "Itaú",
  "Bradesco",
  "Santander",
  "Caixa Econômica Federal",
  "Banco do Brasil",
  "Banco Inter",
  "Sicredi",
  "Sicoob",
  "Safra",
  "C6 Bank",
  "Banco Original",
  "Banco Pan",
] as const;

function normalizeBankKey(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Padroniza nome de banco (ex.: nupagamentos → Nubank). */
export function normalizeBankName(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  const key = normalizeBankKey(trimmed);
  const alias = BANK_ALIASES[key];
  if (alias) return alias;

  return trimmed.charAt(0).toLocaleUpperCase("pt-BR") + trimmed.slice(1);
}
