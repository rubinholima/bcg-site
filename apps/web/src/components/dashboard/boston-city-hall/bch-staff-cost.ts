export type StaffRateType = "daily" | "hourly" | "fixed";

export function parseAmount(v: string): number | null {
  const n = Number.parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function computePlannedCostPreview(input: {
  rateType: string;
  rateAmount: string;
  plannedQuantity: string;
  plannedStartAt?: string;
  plannedEndAt?: string;
}): number | null {
  const rate = parseAmount(input.rateAmount);
  if (rate == null) return null;
  const type = input.rateType.toLowerCase();
  if (type === "fixed") return rate;
  const qty = parseAmount(input.plannedQuantity);
  if (type === "daily") return rate * (qty ?? 1);
  if (type === "hourly") {
    if (qty != null) return rate * qty;
    if (input.plannedStartAt && input.plannedEndAt) {
      const s = new Date(input.plannedStartAt).getTime();
      const e = new Date(input.plannedEndAt).getTime();
      if (e > s) return rate * ((e - s) / 3600000);
    }
    return rate;
  }
  return rate;
}

export function formatMoneyPreview(amount: number | null, currency: string): string {
  if (amount == null) return "—";
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency || "USD" }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
