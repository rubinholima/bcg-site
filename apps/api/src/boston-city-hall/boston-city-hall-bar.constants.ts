export const BCH_BAR_PRODUCT_CATEGORIES = [
  'beer',
  'wine',
  'spirits',
  'cocktails',
  'soft_drink',
  'water',
  'food',
  'other',
] as const;
export type BchBarProductCategory = (typeof BCH_BAR_PRODUCT_CATEGORIES)[number];

export const BCH_BAR_PHYSICAL_UNIT_TYPES = [
  'bottle',
  'can',
  'case',
  'keg',
  'unit',
] as const;
export type BchBarPhysicalUnitType = (typeof BCH_BAR_PHYSICAL_UNIT_TYPES)[number];

export const BCH_BAR_LOCATION_KINDS = ['central', 'event_bar'] as const;

export const BCH_BAR_CENTRAL_LOCATION_CODE = 'central';

export type BchBarPhysicalUnitDto = {
  id: string;
  unitType: string;
  label: string | null;
  volumeMl: number | null;
  quantityBasis: string;
};

export type BchBarProductDto = {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string | null;
  imageUrl: string | null;
  active: boolean;
  physicalUnit: BchBarPhysicalUnitDto | null;
  createdAt: string;
  updatedAt: string;
};

export type BchBarSellingUnitDto = {
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

export type BchBarSellingUnitPriceDto = {
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

export type BchBarInventoryLocationDto = {
  id: string;
  code: string;
  name: string;
  kind: string;
  eventId: string | null;
  active: boolean;
  sortOrder: number;
};

export type BchBarStockBalanceDto = {
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

export const BCH_BAR_STOCK_DIRECTIONS = ['in', 'out'] as const;
export type BchBarStockDirection = (typeof BCH_BAR_STOCK_DIRECTIONS)[number];

export const BCH_BAR_MOVEMENT_TYPES = [
  'initial_balance',
  'purchase_receipt',
  'transfer_in',
  'transfer_out',
  'sale',
  'complimentary',
  'breakage',
  'spill_waste',
  'internal_use',
  'tasting',
  'return_in',
  'return_out',
  'physical_count_adjustment',
  'manual_adjustment',
  'other',
] as const;
export type BchBarMovementType = (typeof BCH_BAR_MOVEMENT_TYPES)[number];

/** Direção fixa por tipo; `both` = entrada ou saída explícita na API. */
export const BCH_BAR_MOVEMENT_TYPE_DIRECTION: Record<
  BchBarMovementType,
  'in' | 'out' | 'both'
> = {
  initial_balance: 'in',
  purchase_receipt: 'in',
  transfer_in: 'in',
  transfer_out: 'out',
  sale: 'out',
  complimentary: 'out',
  breakage: 'out',
  spill_waste: 'out',
  internal_use: 'out',
  tasting: 'out',
  return_in: 'in',
  return_out: 'out',
  physical_count_adjustment: 'both',
  manual_adjustment: 'both',
  other: 'both',
};

export const BCH_BAR_STOCK_ADJUSTMENT_KINDS = [
  'initial_balance',
  'manual_adjustment',
  'physical_count_adjustment',
] as const;

export type BchBarStockMovementDto = {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  movementType: string;
  direction: BchBarStockDirection;
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

export const BCH_BAR_OPEN_CONTAINER_STATUSES = ['open', 'empty', 'discarded', 'closed'] as const;

export const BCH_BAR_CONTAINER_CONSUMPTION_TYPES = [
  'sale',
  'complimentary',
  'spill_waste',
  'internal_use',
  'tasting',
  'manual_adjustment',
] as const;

export type BchBarOpenContainerDto = {
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
  eventId: string | null;
  notes: string | null;
  openedByUserId: string | null;
  openedByName: string | null;
};

export type BchBarOpenContainerLedgerDto = {
  id: string;
  openContainerId: string;
  recordType: string;
  consumptionType: string | null;
  quantity: string;
  contentDelta: string | null;
  remainingAfter: string;
  sellingUnitName: string | null;
  reason: string | null;
  notes: string | null;
  sourceKey: string | null;
  createdByName: string | null;
  createdAt: string;
};

export type BchBarSellingUnitAvailabilityDto = {
  sellingUnitId: string;
  locationId: string;
  mode: 'whole_unit' | 'portion';
  fulfillableUnits: string;
  closedPhysicalUnits: string;
  openRemainingContent: string;
  contentUnit: string | null;
  portionSize: string | null;
};
