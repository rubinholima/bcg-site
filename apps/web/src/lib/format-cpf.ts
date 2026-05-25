function onlyDigits(s: string): string {
  return (s ?? "").replace(/\D/g, "").slice(0, 11);
}

/** Formata CPF enquanto digita ou ao exibir: 000.000.000-00 */
export function formatCpfInput(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function formatCpfForDisplay(value: string | null | undefined): string {
  return formatCpfInput(value ?? "");
}
