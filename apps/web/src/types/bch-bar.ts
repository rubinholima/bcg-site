export const BCH_BAR_PRODUCT_CATEGORIES = [
  "beer",
  "wine",
  "spirits",
  "cocktails",
  "soft_drink",
  "water",
  "food",
  "other",
] as const;

export const BCH_BAR_CATEGORY_LABEL: Record<(typeof BCH_BAR_PRODUCT_CATEGORIES)[number], string> = {
  beer: "Cerveja",
  wine: "Vinho",
  spirits: "Destilados",
  cocktails: "Coquetéis",
  soft_drink: "Refrigerante",
  water: "Água",
  food: "Alimentos",
  other: "Outros",
};

export const BCH_BAR_PHYSICAL_UNIT_TYPES = ["bottle", "can", "case", "keg", "unit"] as const;

export const BCH_BAR_PHYSICAL_UNIT_LABEL: Record<
  (typeof BCH_BAR_PHYSICAL_UNIT_TYPES)[number],
  string
> = {
  bottle: "Garrafa",
  can: "Lata",
  case: "Caixa",
  keg: "Barril",
  unit: "Unidade",
};

export type BchBarPhysicalUnit = {
  id: string;
  unitType: string;
  label: string | null;
  volumeMl: number | null;
  quantityBasis: string;
};

export type BchBarProduct = {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string | null;
  imageUrl: string | null;
  active: boolean;
  physicalUnit: BchBarPhysicalUnit | null;
  createdAt: string;
  updatedAt: string;
};

export type BchBarSellingUnit = {
  id: string;
  productId: string;
  productName?: string;
  productActive?: boolean;
  name: string;
  active: boolean;
  sortOrder: number;
  portionAmount: string | null;
  portionUnit: string | null;
  physicalUnitsConsumedPerSale: string;
  expectedPortionsPerPhysical: string | null;
  consumeDisplayLabel?: string | null;
  yieldDisplayLabel?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BchBarOpenContainer = {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  status: string;
  contentUnit: string;
  originalContent: string;
  remainingContent: string;
  expectedPortionsRemaining: string | null;
  openedAt: string;
  closedAt: string | null;
  openedByName: string | null;
};

export type BchBarOpenContainerLedgerEntry = {
  id: string;
  recordType: string;
  consumptionType: string | null;
  quantity: string;
  contentDelta: string | null;
  remainingAfter: string;
  sellingUnitName: string | null;
  reason: string | null;
  createdByName: string | null;
  createdAt: string;
};

export type BchBarSellingUnitPrice = {
  id: string;
  sellingUnitId: string;
  sellingUnitName?: string;
  price: string;
  currency: string;
  active: boolean;
  validFrom: string | null;
  validTo: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BchBarInventoryLocation = {
  id: string;
  code: string;
  name: string;
  kind: string;
  eventId: string | null;
  active: boolean;
  sortOrder: number;
};

export type BchBarStockBalance = {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  physicalUnitType: string | null;
  locationId: string;
  locationCode: string;
  locationName: string;
  quantityOnHand: string;
  updatedAt: string;
  latestMovementAt: string | null;
};

export const BCH_BAR_MOVEMENT_TYPES = [
  "initial_balance",
  "purchase_receipt",
  "transfer_in",
  "transfer_out",
  "sale",
  "complimentary",
  "breakage",
  "spill_waste",
  "internal_use",
  "tasting",
  "return_in",
  "return_out",
  "physical_count_adjustment",
  "manual_adjustment",
  "other",
] as const;

export const BCH_BAR_MOVEMENT_TYPE_LABEL: Record<(typeof BCH_BAR_MOVEMENT_TYPES)[number], string> = {
  initial_balance: "Saldo inicial",
  purchase_receipt: "Entrada (compra)",
  transfer_in: "Transferência (entrada)",
  transfer_out: "Transferência (saída)",
  sale: "Venda",
  complimentary: "Cortesia",
  breakage: "Quebra",
  spill_waste: "Desperdício",
  internal_use: "Uso interno",
  tasting: "Degustação",
  return_in: "Devolução (entrada)",
  return_out: "Devolução (saída)",
  physical_count_adjustment: "Ajuste de contagem",
  manual_adjustment: "Ajuste manual",
  other: "Outro",
};

export const BCH_BAR_POS_PAYMENT_METHODS = [
  "cash",
  "credit_card",
  "debit_card",
  "pix",
  "other",
] as const;

export const BCH_BAR_POS_PAYMENT_METHOD_LABEL: Record<
  (typeof BCH_BAR_POS_PAYMENT_METHODS)[number],
  string
> = {
  cash: "Dinheiro",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  pix: "PIX",
  other: "Outro",
};

export type BchBarPosCatalogItem = {
  productId: string;
  productSku: string;
  productName: string;
  category: string;
  sellingUnitId: string;
  sellingUnitName: string;
  unitPrice: string;
  currency: string;
  priceId: string;
  availability: "available" | "low" | "unavailable" | null;
  fulfillableUnits: string | null;
};

export type BchBarSaleItem = {
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

export type BchBarSalePayment = {
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

export type BchBarSale = {
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
  items: BchBarSaleItem[];
  payments: BchBarSalePayment[];
  amountPaid: string;
  amountDue: string;
};

export type BchBarEventInventory = {
  id: string;
  eventId: string;
  eventTitle: string | null;
  locationId: string;
  locationCode: string;
  locationName: string;
  status: string;
  openedAt: string | null;
  closedAt: string | null;
  openedByName: string | null;
  closedByName: string | null;
  notes: string | null;
  openContainersUnresolved: number;
};

export type BchBarEventInventorySummaryLine = {
  productId: string;
  productSku: string;
  productName: string;
  initiallyAllocated: string;
  replenished: string;
  totalReceived: string;
  returnedClosed: string;
  currentClosedBalance: string;
  posSold: string;
  complimentary: string;
  wasteBreakage: string;
  internalUseTasting: string;
  openContainersCount: number;
  openRemainingContent: string;
};

export type BchBarEventInventorySummary = {
  eventInventoryId: string;
  eventId: string;
  locationId: string;
  status: string;
  lines: BchBarEventInventorySummaryLine[];
};

export type BchBarStockMovement = {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  movementType: string;
  direction: "in" | "out";
  quantity: string;
  unitBasis: string | null;
  eventId: string | null;
  referenceType: string | null;
  referenceId: string | null;
  sourceKey: string | null;
  transferGroupId: string | null;
  reversesMovementId: string | null;
  reason: string | null;
  notes: string | null;
  createdByUserId: string | null;
  createdByName: string | null;
  createdAt: string;
};
