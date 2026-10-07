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
  createdAt: string;
  updatedAt: string;
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
  locationId: string;
  locationCode: string;
  locationName: string;
  quantityOnHand: string;
  updatedAt: string;
};
