import { formatCpfForDisplay } from "@/lib/format-cpf";
import { formatPhoneForDisplay } from "@/lib/format-phone";

/** Texto de cadastro em maiúsculas (pt-BR). E-mail não usa. */
export function cadastroDisplayUpper(value: string | null | undefined): string {
  const t = (value ?? "").trim();
  if (!t) return "—";
  return t.toLocaleUpperCase("pt-BR");
}

export function employeeCpfDisplay(value: string | null | undefined): string {
  const formatted = formatCpfForDisplay(value);
  return formatted || "—";
}

export function employeePhoneDisplay(value: string | null | undefined): string {
  const formatted = formatPhoneForDisplay(value);
  return formatted || "—";
}

/** ID interno curto (últimos 8 caracteres do cuid). */
export function employeeInternalIdDisplay(id: string | null | undefined): string {
  if (!id?.trim()) return "—";
  return id.slice(-8).toUpperCase();
}

export function employeeCodeDisplay(code: string | null | undefined): string {
  const t = (code ?? "").trim();
  return t || "—";
}
