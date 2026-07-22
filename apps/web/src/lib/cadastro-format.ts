/** Espelha regras da API: cadastro em MAIÚSCULAS; e-mail sempre minúsculo. */

const LOCALE = "pt-BR";

export function cadastroUpper(value: string | null | undefined): string {
  const t = (value ?? "").trim();
  if (!t) return "";
  return t.toLocaleUpperCase(LOCALE);
}

export function cadastroEmail(value: string | null | undefined): string {
  const t = (value ?? "").trim();
  if (!t) return "";
  return t.toLowerCase();
}

export function formatRequesterDisplay(
  name: string | null | undefined,
  email: string | null | undefined,
): { name: string; email: string } {
  return {
    name: cadastroUpper(name) || "—",
    email: cadastroEmail(email),
  };
}
