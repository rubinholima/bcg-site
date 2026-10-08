export const BCH_BAR_EVENT_INVENTORY_STATUSES = ['draft', 'active', 'closed'] as const;
export type BchBarEventInventoryStatus = (typeof BCH_BAR_EVENT_INVENTORY_STATUSES)[number];

export const BCH_BAR_EVENT_INVENTORY_REF_TYPE = 'bch_bar_event_inventory';

export const BCH_BAR_EVENT_INVENTORY_OPERATION = {
  initial_allocation: 'initial_allocation',
  replenishment: 'replenishment',
  event_return: 'event_return',
} as const;

export type BchBarEventInventoryOperation =
  (typeof BCH_BAR_EVENT_INVENTORY_OPERATION)[keyof typeof BCH_BAR_EVENT_INVENTORY_OPERATION];

export type BchBarEventInventoryDto = {
  id: string;
  eventId: string;
  eventTitle: string | null;
  locationId: string;
  locationCode: string;
  locationName: string;
  status: string;
  openedAt: string | null;
  closedAt: string | null;
  openedByUserId: string | null;
  openedByName: string | null;
  closedByUserId: string | null;
  closedByName: string | null;
  notes: string | null;
  openContainersUnresolved: number;
  latestPhysicalCountAt: string | null;
  latestPhysicalCountDivergenceProducts: number;
};

export type BchBarEventInventorySummaryLineDto = {
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

export type BchBarEventInventorySummaryDto = {
  eventInventoryId: string;
  eventId: string;
  locationId: string;
  status: string;
  lines: BchBarEventInventorySummaryLineDto[];
};
