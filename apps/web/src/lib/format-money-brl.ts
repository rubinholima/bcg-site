/** Exibe valor numérico como moeda pt-BR (sem prefixo R$). */
export function formatBrlAmount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Converte string digitada (ex.: "3.500,00" ou só números) para número. */
export function parseBrlAmount(input: string): number | null {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;
  return Number(digits) / 100;
}

/** Máscara enquanto digita: centavos → "1.234,56" */
export function maskBrlInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 15);
  if (!digits) return "";
  const num = Number(digits) / 100;
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
