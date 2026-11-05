export type QuoteInviteItemLine = {
  lineId: string;
  description: string;
  quantity: number;
  unit?: string;
};

export type QuoteItemWithLine = {
  lineId?: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
};

export function buildItemsSnapshotFromRequisition(raw: unknown): QuoteInviteItemLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row, index) => {
    const item = row as { description?: string; quantity?: number; unit?: string };
    return {
      lineId: String(index),
      description: String(item.description ?? '').trim(),
      quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
      unit: item.unit?.trim() || 'un',
    };
  });
}
