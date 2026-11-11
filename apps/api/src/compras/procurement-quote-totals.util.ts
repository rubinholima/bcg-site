export type QuotePricingBreakdown = {
  tax?: number;
  shipping?: number;
  discount?: number;
  otherCosts?: number;
};

export function computeItemsSubtotal(
  items: Array<{ quantity: number; unitPrice: number }>,
): number {
  return items.reduce((sum, i) => sum + (i.quantity || 0) * (i.unitPrice || 0), 0);
}

export function computeQuoteGrandTotal(
  itemsSubtotal: number,
  breakdown?: QuotePricingBreakdown | null,
): number {
  const tax = breakdown?.tax ?? 0;
  const shipping = breakdown?.shipping ?? 0;
  const discount = breakdown?.discount ?? 0;
  const other = breakdown?.otherCosts ?? 0;
  const total = itemsSubtotal + tax + shipping + other - discount;
  return Math.max(0, Math.round(total * 100) / 100);
}
