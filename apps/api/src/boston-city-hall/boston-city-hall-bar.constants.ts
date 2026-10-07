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
  locationId: string;
  locationCode: string;
  locationName: string;
  quantityOnHand: string;
  updatedAt: string;
};
