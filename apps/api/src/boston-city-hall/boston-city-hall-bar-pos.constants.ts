export const BCH_BAR_SALE_STATUSES = ['open', 'completed', 'cancelled'] as const;
export type BchBarSaleStatus = (typeof BCH_BAR_SALE_STATUSES)[number];

export const BCH_BAR_SALE_PAYMENT_STATUSES = ['unpaid', 'partial', 'paid'] as const;
export type BchBarSalePaymentStatus = (typeof BCH_BAR_SALE_PAYMENT_STATUSES)[number];

export const BCH_BAR_POS_PAYMENT_METHODS = [
  'cash',
  'credit_card',
  'debit_card',
  'pix',
  'other',
] as const;
export type BchBarPosPaymentMethod = (typeof BCH_BAR_POS_PAYMENT_METHODS)[number];

export const BCH_BAR_POS_PAYMENT_METHOD_LABEL: Record<BchBarPosPaymentMethod, string> = {
  cash: 'Dinheiro',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  pix: 'PIX',
  other: 'Outro',
};

export type BchBarSaleItemDto = {
  id: string;
  productId: string;
  sellingUnitId: string;
  productName: string;
  sellingUnitName: string;
  quantity: string;
  unitPrice: string;
  lineSubtotal: string;
  lineDiscount: string;
  lineTotal: string;
  currency: string;
  priceId: string | null;
  inventoryConsumedAt: string | null;
  sortOrder: number;
};

export type BchBarSalePaymentDto = {
  id: string;
  method: string;
  methodLabel: string;
  amount: string;
  amountReceived: string | null;
  changeDue: string | null;
  status: string;
  reference: string | null;
  receivedByUserId: string | null;
  receivedByName: string | null;
  createdAt: string;
};

export type BchBarSaleDto = {
  id: string;
  saleNumber: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  eventId: string | null;
  status: string;
  currency: string;
  subtotal: string;
  discountTotal: string;
  total: string;
  paymentStatus: string;
  terminalLabel: string | null;
  openedByUserId: string | null;
  openedByName: string | null;
  closedByUserId: string | null;
  closedByName: string | null;
  openedAt: string;
  closedAt: string | null;
  notes: string | null;
  items: BchBarSaleItemDto[];
  payments: BchBarSalePaymentDto[];
  amountPaid: string;
  amountDue: string;
};

export type BchBarPosCatalogItemDto = {
  productId: string;
  productSku: string;
  productName: string;
  category: string;
  sellingUnitId: string;
  sellingUnitName: string;
  unitPrice: string;
  currency: string;
  priceId: string;
  availability: 'available' | 'low' | 'unavailable' | null;
  fulfillableUnits: string | null;
};

export function saleItemInventorySourceKey(saleId: string, saleItemId: string): string {
  return `bar_sale:${saleId}:item:${saleItemId}`;
}
