/** Prévia de parcelas — mesma regra de centavos do backend. */
export function splitInstallmentPreview(
  total: number,
  count: number,
): Array<{ installmentNumber: number; amount: number }> {
  if (count < 1 || !Number.isFinite(total) || total <= 0) return [];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const remainder = cents - base * count;
  return Array.from({ length: count }, (_, i) => ({
    installmentNumber: i + 1,
    amount: (base + (i < remainder ? 1 : 0)) / 100,
  }));
}
