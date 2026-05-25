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
