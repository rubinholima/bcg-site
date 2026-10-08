export const BCH_BAR_PHYSICAL_COUNT_STATUSES = [
  'draft',
  'in_progress',
  'completed',
  'cancelled',
] as const;
export type BchBarPhysicalCountStatus = (typeof BCH_BAR_PHYSICAL_COUNT_STATUSES)[number];

export const BCH_BAR_PHYSICAL_COUNT_REF_TYPE = 'physical_count';

export const BCH_BAR_PHYSICAL_COUNT_DIVERGENCE_REASONS = [
  'breakage',
  'spill_waste',
  'unrecorded_sale',
  'complimentary',
  'internal_use',
  'transfer_error',
  'receiving_error',
  'counting_error',
  'theft_loss',
  'found_stock',
  'other',
] as const;
export type BchBarPhysicalCountDivergenceReason =
  (typeof BCH_BAR_PHYSICAL_COUNT_DIVERGENCE_REASONS)[number];

export function bchBarPhysicalCountItemSourceKey(countId: string, itemId: string): string {
  return `bar_physical_count:${countId}:item:${itemId}`;
}

export type BchBarPhysicalCountOpenContainerInfo = {
  id: string;
  productId: string;
  productName: string;
  remainingContent: string;
  contentUnit: string;
  status: string;
};

export type BchBarPhysicalCountItemDto = {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  expectedQuantity: string;
  countedQuantity: string | null;
  divergenceQuantity: string | null;
  unitBasis: string | null;
  reason: string | null;
  notes: string | null;
  adjustedMovementId: string | null;
  countedAt: string | null;
};

export type BchBarPhysicalCountTotalsDto = {
  productsInSession: number;
  productsCounted: number;
  productsWithDivergence: number;
  expectedByUnit: Record<string, string>;
  countedByUnit: Record<string, string>;
  positiveDivergenceByUnit: Record<string, string>;
  negativeDivergenceByUnit: Record<string, string>;
};

export type BchBarPhysicalCountDto = {
  id: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  eventId: string | null;
  eventTitle: string | null;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  startedByName: string | null;
  completedByName: string | null;
  notes: string | null;
  items: BchBarPhysicalCountItemDto[];
  openContainers: BchBarPhysicalCountOpenContainerInfo[];
  totals: BchBarPhysicalCountTotalsDto;
};
